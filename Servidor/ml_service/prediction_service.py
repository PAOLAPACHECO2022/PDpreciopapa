import os
# ══════════════════════════════════════════════════════════════════════════════
# VARIABLES DE ENTORNO PARA OPTIMIZAR TENSORFLOW EN PRODUCCIÓN (MODO CPU)
# ══════════════════════════════════════════════════════════════════════════════
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"  # Silencia advertencias innecesarias de TF e inicializaciones de CUDA

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from datetime import datetime, timedelta
from lxml import etree
import numpy as np
import pandas as pd
import tensorflow as tf
import joblib
import warnings
import traceback
import requests
import threading
import pickle
import gc
from collections import OrderedDict
warnings.filterwarnings("ignore")

# 🆕 Limita los hilos internos de TensorFlow: por defecto TF reserva pools de
# hilos según los cores disponibles, lo que en instancias pequeñas (Render
# free/starter) suma overhead de memoria innecesario para un servicio que
# solo hace inferencia (no entrenamiento) y no necesita paralelismo agresivo.
try:
    tf.config.threading.set_intra_op_parallelism_threads(1)
    tf.config.threading.set_inter_op_parallelism_threads(1)
except Exception as _tf_thread_err:
    print(f"[TF CONFIG] No se pudo limitar threads de TensorFlow: {_tf_thread_err}")

app = FastAPI(
    title="Agro Inferencia API",
    description="Motor predictivo optimizado basado en redes recurrentes LSTM v7.14 para precios agrícolas",
    version="7.14"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Luego puedes restringir a tu dominio del frontend
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIONES GLOBALES REPLICADAS DEL MODELO ORIGINAL
# ══════════════════════════════════════════════════════════════════════════════
TARGET = "precio_promedio"
WINDOW_SIZE = 60

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "model_artifacts")

HORIZONTES_VALIDOS = [1, 7, 30]

HORIZONTES_HABILITADOS_POR_PRODUCTO = {
    "papa_negra": [1, 7, 30],
    "papa_amarilla_BOGOTA": [1],
    "papa_amarilla_TUNJA": [1],
}

N_BOOTSTRAP = 15
RUIDO_FRAC_STD = 0.01  # 1% de la desviación histórica de cada variable cruda

FILTROS_SEGMENTO = {
    "papa_negra": {
        "nombres_prod": ["Papa negra", "papa negra", "PAPA NEGRA"],
        "ciudades_norm": None,  # Papa Negra solo existe para Bogotá en los datos
    },
    "papa_amarilla_BOGOTA": {
        "nombres_prod": ["Papa criolla", "papa criolla", "PAPA CRIOLLA",
                         "Papa amarilla", "papa amarilla", "PAPA AMARILLA"],
        "ciudades_norm": ["Bogotá", "BOGOTA", "Bogota", "bogota", "BOGOTÁ", "bogotá"],
    },
    "papa_amarilla_TUNJA": {
        "nombres_prod": ["Papa criolla", "papa criolla", "PAPA CRIOLLA",
                         "Papa amarilla", "papa amarilla", "PAPA AMARILLA"],
        "ciudades_norm": ["Tunja", "TUNJA", "tunja"],
    },
}
# servicio SOAP de SIPSA/DANE — precios recientes en tiempo real,

SIPSA_ENDPOINT = "https://appweb.dane.gov.co:443/sipsaWS/SrvSipsaUpraBeanService"
SIPSA_HEADERS = {
    "Content-Type": "application/soap+xml; charset=utf-8",
    "User-Agent": "Mozilla/5.0",
}
SIPSA_BODY = """<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:ser="http://servicios.sipsa.co.gov.dane/">
   <soap:Body>
      <ser:promediosSipsaCiudad/>
   </soap:Body>
</soap:Envelope>"""

# Mapeo segmento -> (producto, ciudad) tal como los nombra el servicio SIPSA
# (distinto del nombrado producto_norm/ciudad_norm de la hoja de Google).
FILTROS_SIPSA = {
    "papa_negra": {"producto": ["Papa negra*", "Papa negra"], "ciudad": ["BOGOTÁ, D.C."]},
    "papa_amarilla_BOGOTA": {"producto": ["Papa criolla"], "ciudad": ["BOGOTÁ, D.C."]},
    "papa_amarilla_TUNJA": {"producto": ["Papa criolla"], "ciudad": ["TUNJA"]},
}

# Misma hoja usada en el notebook de entrenamiento (df_final3)
RUTA_DATOS_REALES = os.environ.get(
    "RUTA_DATOS_REALES",
    "https://docs.google.com/spreadsheets/d/15qCMwQkMm44_T_95mW-O5Xe7L6HHu-12/export?format=xlsx",
)
# Cada cuántas horas se refresca la hoja completa desde Google Sheets
HORAS_REFRESCO_DATOS = float(os.environ.get("HORAS_REFRESCO_DATOS", "6"))

MODELOS_CONFIG = [
    {
        "key": "papa_negra",
        # Alineado 1:1 con MODELOS[0]["features"] del script de entrenamiento (v7.10/v7.11)
        "features": [
            "precio_promedio",
            "tmedia_c_lag20",
            "tmedia_c",
            "prec30_mm",
            "Cant_Ton_Total",
            "costo_total",
        ],
        "features_por_horizonte": {
            1: ["precio_promedio", "prec30_mm"],
            7: ["precio_promedio", "tmedia_c_lag20", "prec30_mm"],
            30: ["precio_promedio", "Cant_Ton_Total", "costo_total", "tmedia_c"],
        },
        "ops_agregacion": ["last", "mean", "mean", "mean", "sum", "sum"],
        "modo_secuencia": "directo",
        "params": {"DIFERENCIAR": False, "WINDOW_SIZE": 60}
    },
    {
        "key": "papa_amarilla_BOGOTA",
        "features": ["precio_promedio", "Cant_Ton_Total", "costo_total", "tmedia_c_lag20"],
        # Este modelo no define features_por_horizonte particular: usa el set
        # completo de "features" para h=1, h=7 y ahora también h=30.
        "ops_agregacion": ["last", "sum", "sum", "mean"],
        "modo_secuencia": "agregado",
        "params": {"DIFERENCIAR": True, "WINDOW_SIZE": 60}
    },
    {
        "key": "papa_amarilla_TUNJA",
        "features": ["precio_promedio", "Cant_Ton_Total", "costo_total", "tmedia_c"],
        "ops_agregacion": ["last", "sum", "sum", "mean"],
        "modo_secuencia": "agregado",
        "params": {"DIFERENCIAR": True, "WINDOW_SIZE": 30}
    }
]

# ══════════════════════════════════════════════════════════════════════════════
# 🆕 CACHE DE MODELOS CON LÍMITE (LRU) — evita que TensorFlow acumule en RAM
# todos los modelos que alguna vez se han pedido. En el peor caso este
# servicio puede cargar hasta 5 modelos distintos (papa_negra h=1/7/30,
# papa_amarilla_BOGOTA h=1, papa_amarilla_TUNJA h=1); cada uno con su propio
# runtime de TensorFlow puede sumar cientos de MB, lo que en instancias
# pequeñas de Render provoca reinicios por out-of-memory (que a su vez
# generan los 503/429 vistos en el frontend). Con esto, el cache descarta el
# modelo menos usado recientemente cuando se supera MODEL_CACHE_MAX.
# ══════════════════════════════════════════════════════════════════════════════
MODEL_CACHE_MAX = int(os.environ.get("MODEL_CACHE_MAX", "3"))
MODEL_CACHE = OrderedDict()
MODEL_CACHE_LOCK = threading.Lock()


def _model_cache_get(cache_key: str):
    with MODEL_CACHE_LOCK:
        if cache_key in MODEL_CACHE:
            MODEL_CACHE.move_to_end(cache_key)
            return MODEL_CACHE[cache_key]
    return None


def _model_cache_set(cache_key: str, value: tuple):
    with MODEL_CACHE_LOCK:
        MODEL_CACHE[cache_key] = value
        MODEL_CACHE.move_to_end(cache_key)
        while len(MODEL_CACHE) > MODEL_CACHE_MAX:
            clave_vieja, _valor_viejo = MODEL_CACHE.popitem(last=False)
            print(f"[MODEL_CACHE] Límite alcanzado ({MODEL_CACHE_MAX}); liberando modelo menos usado: {clave_vieja}")
    # gc.collect() fuera del lock: libera la referencia recién eliminada
    gc.collect()


# ══════════════════════════════════════════════════════════════════════════════
# 🆕 v7.14: CARGA DEL HISTÓRICO REAL (reemplaza el histórico simulado)
# ══════════════════════════════════════════════════════════════════════════════

# Cache del histórico REAL por segmento: {producto: (DataFrame, fecha_de_carga)}
DATOS_REALES_CACHE = {}

# 🆕 Lock para que dos requests concurrentes nunca disparen dos descargas de
# la hoja de Google Sheets al mismo tiempo (causa directa del 429 visto en
# producción: Google responde "Too Many Requests" al endpoint anónimo de
# export cuando llegan varias descargas simultáneas, algo muy probable justo
# después de que el proceso se reinicia y el cache en RAM se pierde).
DATOS_REALES_LOCK = threading.Lock()

# 🆕 Cache en disco de la tabla maestra: sobrevive a un reinicio del proceso
# (por ejemplo tras un out-of-memory kill en Render), así la primera
# petición después de un reinicio no depende obligatoriamente de que Google
# Sheets responda a tiempo.
CACHE_DISCO_PATH = os.path.join(BASE_DIR, "_cache_tabla_maestra.pkl")


def _guardar_cache_disco(df_maestro: pd.DataFrame, momento: datetime) -> None:
    try:
        with open(CACHE_DISCO_PATH, "wb") as f:
            pickle.dump({"df": df_maestro, "momento": momento}, f)
    except Exception as e:
        print(f"[DATOS REALES] No se pudo persistir el cache en disco: {e}")


def _cargar_cache_disco():
    """Devuelve (df_maestro, momento) desde disco, o (None, None) si no existe/falla."""
    try:
        with open(CACHE_DISCO_PATH, "rb") as f:
            data = pickle.load(f)
        return data.get("df"), data.get("momento")
    except Exception:
        return None, None


def _descargar_precios_recientes_sipsa() -> pd.DataFrame:
    """
    Consulta el servicio SOAP público de SIPSA/DANE y devuelve un
    DataFrame crudo con TODOS los productos/ciudades que reporta (se
    filtra por segmento después, en _extender_con_precios_recientes).
    """
    resp = requests.post(
        SIPSA_ENDPOINT, data=SIPSA_BODY.encode("utf-8"), headers=SIPSA_HEADERS, timeout=30
    )
    if resp.status_code != 200 or "<html" in resp.text.lower()[:200]:
        raise RuntimeError(f"SIPSA no respondió correctamente (status {resp.status_code}).")

    root = etree.fromstring(resp.text.encode("utf-8"))
    registros = []
    for ret in root.iter():
        if etree.QName(ret).localname == "return":
            registros.append({etree.QName(c).localname: c.text for c in ret})

    df = pd.DataFrame(registros)
    df["precioPromedio"] = pd.to_numeric(df["precioPromedio"], errors="coerce")
    df["fechaCaptura"] = pd.to_datetime(df["fechaCaptura"], errors="coerce").dt.tz_localize(None)
    df = df.dropna(subset=["precioPromedio", "fechaCaptura"])
    return df


def _extender_con_precios_recientes(df_v: pd.DataFrame, producto: str) -> pd.DataFrame:
    
    try:
        df_sipsa = _descargar_precios_recientes_sipsa()
    except Exception as e:
        print(f"[SIPSA] No se pudo obtener precios recientes ({e}); se usa solo el histórico de Sheets.")
        return df_v

    filtro = FILTROS_SIPSA.get(producto)
    if filtro is None:
        return df_v

    df_seg = df_sipsa[
        df_sipsa["producto"].isin(filtro["producto"]) & df_sipsa["ciudad"].isin(filtro["ciudad"])
    ].copy()
    if df_seg.empty:
        return df_v

    df_seg = df_seg.sort_values("fechaCaptura").groupby("fechaCaptura")["precioPromedio"].last()

    ultima_fecha_sheets = df_v.index.max()
    df_seg = df_seg[df_seg.index > ultima_fecha_sheets]  # solo lo MÁS reciente que la hoja
    if df_seg.empty:
        return df_v

    df_nuevo = pd.DataFrame(index=df_seg.index)
    df_nuevo["precio_promedio"] = df_seg.values
    for col in df_v.columns:
        if col != "precio_promedio":
            df_nuevo[col] = df_v[col].iloc[-1]  # exógenas: último valor real conocido

    df_extendido = pd.concat([df_v, df_nuevo[df_v.columns]]).sort_index()
    df_extendido = df_extendido[~df_extendido.index.duplicated(keep="last")]
    print(
        f"[SIPSA] Histórico extendido con {len(df_nuevo)} día(s) reales adicionales "
        f"(hasta {df_extendido.index.max().date()})."
    )
    return df_extendido

def _descargar_tabla_maestra() -> pd.DataFrame:
    
    print(f"[DATOS REALES] Descargando tabla maestra desde: {RUTA_DATOS_REALES}")
    df = pd.read_excel(RUTA_DATOS_REALES)
    df["fecha_join"] = pd.to_datetime(df["fecha_join"])
    df = df.sort_values("fecha_join").reset_index(drop=True)

    df["tmedia_c_lag20"] = df["tmedia_c"].shift(20)
    df = df.dropna(subset=["tmedia_c_lag20"])  # mismo recorte que en entrenamiento

    print(f"[DATOS REALES] Tabla maestra descargada: {df.shape[0]} filas.")
    return df


def _filtrar_y_preparar_segmento(df_maestro: pd.DataFrame, producto: str) -> pd.DataFrame:
    filtro = FILTROS_SEGMENTO[producto]
    df_v = df_maestro[df_maestro["producto_norm"].isin(filtro["nombres_prod"])].copy()
    if filtro["ciudades_norm"] is not None:
        df_v = df_v[df_v["ciudad_norm"].isin(filtro["ciudades_norm"])]

    if df_v.empty:
        raise RuntimeError(f"Sin datos reales disponibles para el segmento '{producto}'.")

    columnas = ["precio_promedio", "tmedia_c", "tmedia_c_lag20", "prec30_mm",
                "Cant_Ton_Total", "costo_total"]
    df_v = df_v.sort_values("fecha_join").set_index("fecha_join")[columnas]

    if df_v.index.duplicated().any():
        df_v = df_v.groupby(df_v.index).last()

    # 🆕 v7.17: estirar hasta la fecha real más reciente con SIPSA
    df_v = _extender_con_precios_recientes(df_v, producto)

    df_v = df_v.interpolate(method="time").ffill().bfill()
    return df_v


def obtener_historico_real(producto: str, min_dias: int) -> pd.DataFrame:
    """
    Devuelve al menos `min_dias` filas más recientes del histórico real
    para `producto`, usando cache en memoria (se refresca cada
    HORAS_REFRESCO_DATOS horas, no en cada solicitud).

    🆕 Ahora protegido con un lock (para no disparar descargas concurrentes
    a Google Sheets) y con un cache de respaldo en disco (para no depender
    de Google Sheets justo después de que el proceso se reinicia).
    """
    ahora = datetime.utcnow()
    entrada_cache = DATOS_REALES_CACHE.get(producto)

    necesita_refresco = (
        entrada_cache is None
        or (ahora - entrada_cache[1]) > timedelta(hours=HORAS_REFRESCO_DATOS)
    )

    if necesita_refresco:
        with DATOS_REALES_LOCK:
            # Volvemos a chequear DENTRO del lock: es posible que otro
            # request ya haya refrescado el cache mientras esperábamos aquí.
            entrada_cache = DATOS_REALES_CACHE.get(producto)
            necesita_refresco = (
                entrada_cache is None
                or (datetime.utcnow() - entrada_cache[1]) > timedelta(hours=HORAS_REFRESCO_DATOS)
            )

            if necesita_refresco:
                try:
                    df_maestro = _descargar_tabla_maestra()
                    momento_descarga = datetime.utcnow()
                    for key in FILTROS_SEGMENTO:
                        DATOS_REALES_CACHE[key] = (_filtrar_y_preparar_segmento(df_maestro, key), momento_descarga)
                    _guardar_cache_disco(df_maestro, momento_descarga)
                    entrada_cache = DATOS_REALES_CACHE.get(producto)
                except Exception as e:
                    # Si falla la descarga y ya había un cache previo (aunque esté
                    # vencido), lo seguimos usando en vez de tumbar el servicio.
                    print(f"[DATOS REALES] Falló el refresco desde Sheets ({e}); intentando cache previo o de disco.")
                    if entrada_cache is None:
                        df_disco, momento_disco = _cargar_cache_disco()
                        if df_disco is not None:
                            print(f"[DATOS REALES] Usando cache de disco de {momento_disco}.")
                            for key in FILTROS_SEGMENTO:
                                DATOS_REALES_CACHE[key] = (_filtrar_y_preparar_segmento(df_disco, key), momento_disco)
                            entrada_cache = DATOS_REALES_CACHE.get(producto)
                        else:
                            raise RuntimeError(
                                f"No hay histórico real disponible para '{producto}' y la descarga falló: {e}"
                            )

    df_segmento = entrada_cache[0]
    if len(df_segmento) < min_dias:
        raise RuntimeError(
            f"El histórico real de '{producto}' solo tiene {len(df_segmento)} días; "
            f"se requieren al menos {min_dias}."
        )
    return df_segmento.tail(min_dias).copy()


# ══════════════════════════════════════════════════════════════════════════════
# FUNCIONES MATEMÁTICAS Y DE PREPROCESAMIENTO ORIGINALES
# ══════════════════════════════════════════════════════════════════════════════

def agregar_por_horizonte(data_sc: np.ndarray, h: int, ops_agregacion: list) -> np.ndarray:
    if h == 1: return data_sc
    n_bloques = len(data_sc) // h
    n_feat = data_sc.shape[1]
    result = np.zeros((n_bloques, n_feat))

    for b in range(n_bloques):
        bloque = data_sc[b * h : (b + 1) * h, :]
        for j, op in enumerate(ops_agregacion):
            if op == "last": result[b, j] = bloque[-1, j]
            elif op == "sum": result[b, j] = bloque[:, j].sum()
            else: result[b, j] = bloque[:, j].mean()
    return result


def _transformar_ventana(datos_raw: np.ndarray, scaler_full, feat_idx_h: list,
                         ops_agr_h: list, h: int, modo: str, window_base: int) -> np.ndarray:
    datos_sc = scaler_full.transform(datos_raw)[:, feat_idx_h]

    if modo == "agregado" and h > 1:
        datos_sc = agregar_por_horizonte(datos_sc, h, ops_agr_h)
        win_bloq = min(max(window_base // h, 1), datos_sc.shape[0])
        datos_sc = datos_sc[-win_bloq:, :]

    return datos_sc.reshape(1, datos_sc.shape[0], datos_sc.shape[1])


def predecir_nuevos_datos(model, scaler_full, scaler_target, df_reciente: pd.DataFrame,
                          h: int, modelo_key: str, precio_base_cop: float = None) -> dict:
    cfg = next((m for m in MODELOS_CONFIG if m["key"] == modelo_key), None)
    if cfg is None: raise ValueError(f"modelo_key='{modelo_key}' no identificado.")

    features = cfg["features"]
    ops_agr = cfg["ops_agregacion"]
    params = cfg["params"]
    usar_diff = params["DIFERENCIAR"]
    window_base = params["WINDOW_SIZE"]
    modo = cfg.get("modo_secuencia", "agregado")

    # Extraer las features requeridas por el horizonte
    features_h = cfg.get("features_por_horizonte", {}).get(h, features)
    feat_idx_h = [features.index(f) for f in features_h]
    ops_agr_h = [ops_agr[i] for i in feat_idx_h]

    # Pasamos TODAS las variables para que el scaler no falle por dimensiones
    df_w = df_reciente[features].copy()

    if usar_diff:
        df_w[TARGET] = np.log(df_w[TARGET] / df_w[TARGET].shift(1))
        df_w = df_w.iloc[1:]

    if len(df_w) < window_base:
        raise ValueError(f"df_reciente requiere histórico mínimo de {window_base} registros.")

    # Ventana cruda base (sin ruido) usada tanto para la predicción central
    # como como punto de partida para cada muestra bootstrap.
    datos_raw_base = df_w.tail(window_base).values

    # ── Predicción central (sin ruido) ──────────────────────────────────
    X_inf = _transformar_ventana(datos_raw_base, scaler_full, feat_idx_h, ops_agr_h, h, modo, window_base)

    with tf.device('/CPU:0'):
        pred_sc = model.predict(X_inf, verbose=0)[0, 0]

    pred_inv = scaler_target.inverse_transform([[pred_sc]])[0, 0]
    pred_cop = float(precio_base_cop) * np.exp(pred_inv) if usar_diff else pred_inv

    col_std = datos_raw_base.std(axis=0)
    col_std[col_std == 0] = 1e-9  # Evita ruido nulo en columnas constantes

    preds_boot = []
    for _ in range(N_BOOTSTRAP):
        noise = np.random.normal(0, RUIDO_FRAC_STD * col_std, datos_raw_base.shape)
        datos_raw_noisy = datos_raw_base + noise

        X_boot = _transformar_ventana(datos_raw_noisy, scaler_full, feat_idx_h, ops_agr_h, h, modo, window_base)

        with tf.device('/CPU:0'):
            p_sc = model.predict(X_boot, verbose=0)[0, 0]

        p_inv = scaler_target.inverse_transform([[p_sc]])[0, 0]
        p_cop = float(precio_base_cop) * np.exp(p_inv) if usar_diff else p_inv

        if np.isfinite(p_cop):
            preds_boot.append(p_cop)

    if len(preds_boot) < 2:
        ic_inf, ic_sup = pred_cop, pred_cop
    else:
        ic_inf, ic_sup = np.percentile(preds_boot, [2.5, 97.5])

    if not np.isfinite(pred_cop) or pred_cop <= 0:
        raise ValueError(
            f"Predicción no válida (no positiva o no finita) para "
            f"modelo_key='{modelo_key}' h={h}: {pred_cop}"
        )

    if not np.isfinite(ic_inf) or not np.isfinite(ic_sup):
        ic_inf, ic_sup = pred_cop, pred_cop

    ic_inf, ic_sup = min(ic_inf, ic_sup), max(ic_inf, ic_sup)

    fecha_futura = df_reciente.index[-1] + pd.Timedelta(days=h)

    return {
        "status": "success",
        "modelo_key": modelo_key,
        "fecha_prediccion": fecha_futura.strftime("%Y-%m-%d"),
        "horizonte_h": h,
        "precio_predicho_COP_kg": round(float(pred_cop), 2),
        "IC_inferior_95": round(float(ic_inf), 2),
        "IC_superior_95": round(float(ic_sup), 2),
        "n_bootstrap_validas": len(preds_boot),
    }

# ══════════════════════════════════════════════════════════════════════════════
# AUXILIARES Y ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════
def cargar_artefactos_con_cache(modelo_key: str, h: int):
    """Carga los modelos en memoria una sola vez para optimizar las llamadas.

    🆕 Ahora usa un cache LRU con límite (MODEL_CACHE_MAX) en vez de un dict
    sin límite: si nunca se liberan modelos, TensorFlow puede terminar
    manteniendo en RAM todos los modelos que alguna vez se pidieron
    (hasta 5 en este servicio), lo que en instancias pequeñas de hosting
    provoca reinicios por out-of-memory.
    """
    cache_key = f"{modelo_key}_h{h}"
    cacheado = _model_cache_get(cache_key)
    if cacheado is not None:
        return cacheado

    try:
        model_path = os.path.join(MODELS_DIR, f"best_{modelo_key}_h{h}.keras")
        sf_path = os.path.join(MODELS_DIR, f"scaler_full_{modelo_key}.pkl")
        st_path = os.path.join(MODELS_DIR, f"scaler_target_{modelo_key}.pkl")

        print(f"[DEBUG ARTEFACTOS] Buscando archivos en ruta absoluta: {model_path}")

        if not os.path.exists(model_path) or not os.path.exists(sf_path) or not os.path.exists(st_path):
            faltantes = [p for p in [model_path, sf_path, st_path] if not os.path.exists(p)]
            raise FileNotFoundError(
                f"Faltan archivos binarios de la red neuronal o scalers. Faltantes: {faltantes}"
            )

        print(f"[DEBUG TENSORFLOW] Intentando deserializar {model_path} con compile=False en CPU...")
        try:
            with tf.device('/CPU:0'):
                model = tf.keras.models.load_model(model_path, compile=False, custom_objects={})
            print("[DEBUG TENSORFLOW] ¡Modelo cargado exitosamente en CPU!")
        except Exception as tf_err:
            print(f"[FATAL TENSORFLOW] Error directo de TensorFlow al cargar {model_path}:")
            traceback.print_exc()
            raise tf_err

        scaler_full = joblib.load(sf_path)
        scaler_target = joblib.load(st_path)

        resultado = (model, scaler_full, scaler_target)
        _model_cache_set(cache_key, resultado)
        return resultado
    except Exception as e:
        error_detallado = f"{str(e)} | Trace: {traceback.format_exc()[-250:]}"
        raise RuntimeError(f"Error crítico cargando la arquitectura del modelo: {error_detallado}")


def _construir_df_reciente(producto: str, min_dias: int, overrides: dict) -> pd.DataFrame:
    """
    base = histórico REAL (antes: np.random.uniform(...)).
    Sobre esa base, se sobrescribe el ÚLTIMO día con los valores que el
    usuario haya ajustado en el simulador (igual que antes), para que la
    función de "simular escenario" del dashboard siga funcionando igual.
    """
    df_reciente = obtener_historico_real(producto, min_dias)

    campo_por_param = {
        "precio_promedio": "precio_promedio",
        "tmedia_c": "tmedia_c",
        "tmedia_c_lag20": "tmedia_c_lag20",
        "prec30_mm": "prec30_mm",
        "Cant_Ton_Total": "Cant_Ton_Total",
        "costo_total": "costo_total",
    }
    for param, valor in overrides.items():
        col = campo_por_param.get(param)
        if col is not None and valor is not None:
            df_reciente.iloc[-1, df_reciente.columns.get_loc(col)] = valor

    df_reciente = df_reciente.interpolate(method="time").ffill().bfill()
    return df_reciente


@app.get("/predict")
def ejecutar_inferencia(
    producto: str,
    horizonte: int,
    precio_promedio: Optional[float] = None,
    Cant_Ton_Total: Optional[float] = None,
    costo_total: Optional[float] = None,
    tmedia_c: Optional[float] = None,
    tmedia_c_lag20: Optional[float] = None,
    prec30_mm: Optional[float] = None
):
    if horizonte not in HORIZONTES_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Horizonte inválido. Solo se admite {HORIZONTES_VALIDOS}."
        )

    cfg = next((m for m in MODELOS_CONFIG if m["key"] == producto), None)
    if not cfg:
        raise HTTPException(status_code=400, detail=f"El producto '{producto}' no está configurado.")

    habilitados = HORIZONTES_HABILITADOS_POR_PRODUCTO.get(producto, [])
    if horizonte not in habilitados:
        raise HTTPException(
            status_code=400,
            detail=(
                f"El horizonte h={horizonte} no está habilitado para '{producto}' "
                f"por desempeño insuficiente del modelo (R² negativo en validación). "
                f"Horizontes disponibles para este producto: {habilitados}."
            )
        )

    try:
        model, scaler_full, scaler_target = cargar_artefactos_con_cache(producto, horizonte)

        # 🆕 v7.14: histórico real (95 días, igual margen que antes) en vez de simulado
        overrides = {
            "precio_promedio": precio_promedio,
            "tmedia_c": tmedia_c,
            "tmedia_c_lag20": tmedia_c_lag20,
            "prec30_mm": prec30_mm,
            "Cant_Ton_Total": Cant_Ton_Total,
            "costo_total": costo_total,
        }
        df_reciente = _construir_df_reciente(producto, min_dias=95, overrides=overrides)
        precio_actual_base = float(df_reciente[TARGET].iloc[-1])

        response_payload = predecir_nuevos_datos(
            model=model,
            scaler_full=scaler_full,
            scaler_target=scaler_target,
            df_reciente=df_reciente,
            h=horizonte,
            modelo_key=producto,
            precio_base_cop=precio_actual_base
        )

        return response_payload

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falla interna en la predicción de la red: {str(e)}")


# ══════════════════════════════════════════════════════════════════════════════
# CURVA DIARIA (día 1 a día 30) — Recursivo h=1 calibrado con anclas h=7/h=30
# ══════════════════════════════════════════════════════════════════════════════

DIAS_MAX_SIN_ANCLA = 7

CAMBIO_MAX_ACUMULADO_SIN_ANCLA = 0.15  # +/-15% respecto al precio de partida

def _volatilidad_diaria_historica(df_reciente: pd.DataFrame) -> float:
    """
    Desviación estándar del retorno logarítmico diario, calculada sobre el
    histórico real recibido (no sobre las predicciones recursivas). Se usa
    para acotar cada paso de la recursión a un rango de variación
    fisiológicamente plausible para esta serie, en vez de dejar que el
    modelo se retroalimente sin ningún límite.
    """
    retornos = np.log(df_reciente[TARGET] / df_reciente[TARGET].shift(1)).dropna()
    vol = float(retornos.std())
    return vol if np.isfinite(vol) and vol > 0 else 0.05  # 5% como piso defensivo


def generar_curva_diaria(producto: str, df_reciente: pd.DataFrame, precio_actual_base: float, dias: int = 30) -> list:
    """
    (docstring igual que antes, con el agregado del límite acumulado)
    """
    K_SIGMA_CLAMP = 3.0  # bandas de +/-3 desviaciones estándar históricas (por paso)

    model_h1, sf_h1, st_h1 = cargar_artefactos_con_cache(producto, 1)
    cfg = next((m for m in MODELOS_CONFIG if m["key"] == producto), None)

    features = cfg["features"]
    ops_agr = cfg["ops_agregacion"]
    params = cfg["params"]
    usar_diff = params["DIFERENCIAR"]
    window_base = params["WINDOW_SIZE"]
    modo = cfg.get("modo_secuencia", "agregado")

    features_h1 = cfg.get("features_por_horizonte", {}).get(1, features)
    feat_idx_h1 = [features.index(f) for f in features_h1]
    ops_agr_h1 = [ops_agr[i] for i in feat_idx_h1]

    vol_diaria = _volatilidad_diaria_historica(df_reciente) if usar_diff else None
    
    horizontes_habilitados_producto = HORIZONTES_HABILITADOS_POR_PRODUCTO.get(producto, [1])
    tiene_ancla_producto = any(h in horizontes_habilitados_producto for h in [7, 30])
    limite_acumulado_log = (
        np.log(1 + CAMBIO_MAX_ACUMULADO_SIN_ANCLA)
        if (usar_diff and not tiene_ancla_producto) else None
    )

    df_trabajo = df_reciente[features].copy()

    ultima_fecha = df_trabajo.index[-1]
    ultima_fila_exogenas = df_trabajo.iloc[-1].copy()  # se mantiene constante

    curva_recursiva = []
    n_dias_clamp_aplicado = 0
    n_dias_clamp_acumulado_aplicado = 0
    log_retorno_acumulado = 0.0  # suma de retornos ya aplicados desde el día 0

    for dia in range(1, dias + 1):
        if usar_diff:
            df_diff = df_trabajo.copy()
            df_diff[TARGET] = np.log(df_diff[TARGET] / df_diff[TARGET].shift(1))
            df_diff = df_diff.iloc[1:]
            datos_raw = df_diff.tail(window_base).values
            precio_ancla_paso = float(df_trabajo[TARGET].iloc[-1])
        else:
            datos_raw = df_trabajo.tail(window_base).values
            precio_ancla_paso = None

        if len(datos_raw) < window_base:
            break

        X_inf = _transformar_ventana(datos_raw, sf_h1, feat_idx_h1, ops_agr_h1, 1, modo, window_base)

        with tf.device('/CPU:0'):
            pred_sc = model_h1.predict(X_inf, verbose=0)[0, 0]

        pred_inv = st_h1.inverse_transform([[pred_sc]])[0, 0]

        if usar_diff and vol_diaria is not None:
            limite = K_SIGMA_CLAMP * vol_diaria
            pred_inv_clamped = float(np.clip(pred_inv, -limite, limite))
            if pred_inv_clamped != pred_inv:
                n_dias_clamp_aplicado += 1
            pred_inv = pred_inv_clamped
        
        if limite_acumulado_log is not None:
            acumulado_propuesto = log_retorno_acumulado + pred_inv
            acumulado_recortado = float(
                np.clip(acumulado_propuesto, -limite_acumulado_log, limite_acumulado_log)
            )
            if acumulado_recortado != acumulado_propuesto:
                n_dias_clamp_acumulado_aplicado += 1
            pred_inv = acumulado_recortado - log_retorno_acumulado
            log_retorno_acumulado = acumulado_recortado
        elif usar_diff:
            log_retorno_acumulado += pred_inv

        pred_cop = precio_ancla_paso * np.exp(pred_inv) if usar_diff else pred_inv

        if not np.isfinite(pred_cop) or pred_cop <= 0:
            break

        fecha_dia = ultima_fecha + pd.Timedelta(days=dia)
        curva_recursiva.append({"fecha": fecha_dia, "dia": dia, "precio_recursivo": float(pred_cop)})

        nueva_fila = ultima_fila_exogenas.copy()
        nueva_fila[TARGET] = pred_cop
        df_trabajo.loc[fecha_dia] = nueva_fila

    if not curva_recursiva:
        raise ValueError("No fue posible generar la curva diaria: histórico insuficiente.")

    anclas = {}
    for h_ancla in [7, 30]:
        if h_ancla not in horizontes_habilitados_producto:
            continue
        if h_ancla <= len(curva_recursiva):
            try:
                model_h, sf_h, st_h = cargar_artefactos_con_cache(producto, h_ancla)
                resultado_ancla = predecir_nuevos_datos(
                    model_h, sf_h, st_h, df_reciente, h_ancla, producto, precio_actual_base
                )
                anclas[h_ancla] = resultado_ancla["precio_predicho_COP_kg"]
            except Exception:
                pass

    residual_7 = anclas.get(7, curva_recursiva[6]["precio_recursivo"]) - curva_recursiva[6]["precio_recursivo"] if len(curva_recursiva) >= 7 else 0
    residual_30 = anclas.get(30, curva_recursiva[-1]["precio_recursivo"]) - curva_recursiva[-1]["precio_recursivo"] if len(curva_recursiva) >= 30 else residual_7

    curva_final = []
    for punto in curva_recursiva:
        d = punto["dia"]
        if d <= 7:
            correccion = residual_7 * (d / 7)
        else:
            frac = (d - 7) / max(30 - 7, 1)
            correccion = residual_7 + (residual_30 - residual_7) * frac

        precio_calibrado = punto["precio_recursivo"] + correccion
        curva_final.append({
            "fecha": punto["fecha"].strftime("%Y-%m-%d"),
            "dia": d,
            "precio_predicho_COP_kg": round(float(precio_calibrado), 2),
            "es_ancla": d in (7, 30) and d in anclas,
        })

    generar_curva_diaria._ultimo_clamp_info = {
        "dias_con_clamp_aplicado": n_dias_clamp_aplicado,
        "dias_con_clamp_acumulado_aplicado": n_dias_clamp_acumulado_aplicado,  # 🆕
        "volatilidad_diaria_usada": round(vol_diaria, 5) if vol_diaria is not None else None,
        "limite_acumulado_pct": (
            round(CAMBIO_MAX_ACUMULADO_SIN_ANCLA * 100, 1) if limite_acumulado_log is not None else None
        ),  # 🆕
    }

    return curva_final

@app.get("/predict/curve")
def ejecutar_curva_diaria(
    producto: str,
    dias: int = Query(30, ge=1, le=30),
    precio_promedio: Optional[float] = None,
    Cant_Ton_Total: Optional[float] = None,
    costo_total: Optional[float] = None,
    tmedia_c: Optional[float] = None,
    tmedia_c_lag20: Optional[float] = None,
    prec30_mm: Optional[float] = None
):
    cfg = next((m for m in MODELOS_CONFIG if m["key"] == producto), None)
    if not cfg:
        raise HTTPException(status_code=400, detail=f"El producto '{producto}' no está configurado.")

    try:
        # si el producto no tiene h=7 ni h=30 habilitados, no hay
        # ningún ancla real que corrija la recursión más allá del día 1 —
        # se limita la curva a DIAS_MAX_SIN_ANCLA en vez de dejar que se
        # extrapole 30 días sin ninguna corrección (esto era exactamente
        # lo que producía el disparo a $21.433 en Amarilla-Tunja).
        habilitados = HORIZONTES_HABILITADOS_POR_PRODUCTO.get(producto, [1])
        tiene_ancla = any(h in habilitados for h in [7, 30])
        dias_efectivos = dias if tiene_ancla else min(dias, DIAS_MAX_SIN_ANCLA)
        dias_limitados = dias_efectivos < dias

        overrides = {
            "precio_promedio": precio_promedio,
            "tmedia_c": tmedia_c,
            "tmedia_c_lag20": tmedia_c_lag20,
            "prec30_mm": prec30_mm,
            "Cant_Ton_Total": Cant_Ton_Total,
            "costo_total": costo_total,
        }
        df_reciente = _construir_df_reciente(producto, min_dias=95, overrides=overrides)
        precio_actual_base = float(df_reciente[TARGET].iloc[-1])

        curva = generar_curva_diaria(producto, df_reciente, precio_actual_base, dias=dias_efectivos)
        clamp_info = getattr(generar_curva_diaria, "_ultimo_clamp_info", {})

        anclas_disponibles = [h for h in [7, 30] if h in habilitados]

        return {
            "status": "success",
            "modelo_key": producto,
            "dias_solicitados": dias,
            "dias_generados": len(curva),
            "metodologia": (
                "Recursivo h=1 calibrado con anclas h=7/h=30"
                if anclas_disponibles
                else "Recursivo h=1 puro, acotado por volatilidad histórica (sin anclas: h=7/h=30 no habilitados para este producto)"
            ),
            "anclas_utilizadas": anclas_disponibles,
            "dias_limitados_por_falta_de_ancla": dias_limitados,
            "aviso": (
                f"Este producto solo tiene h=1 validado; la curva se limitó a "
                f"{DIAS_MAX_SIN_ANCLA} días porque no hay un modelo h=7/h=30 "
                f"confiable que corrija la proyección más allá de ese punto."
                if dias_limitados else None
            ),
            "clamp_volatilidad": clamp_info,
            "curva": curva,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falla generando la curva diaria: {str(e)}")


@app.get("/health")
def health_check():
    """
    🆕 Endpoint liviano para keep-alive externo (cron-job.org, UptimeRobot,
    GitHub Actions, etc.). Pegarle cada 10-14 minutos evita que el proceso
    entre en cold-start si el plan de hosting duerme instancias inactivas, y
    permite monitorear cuántos modelos hay cargados en RAM sin disparar
    ninguna inferencia ni descarga de datos.
    """
    return {
        "status": "ok",
        "modelos_en_cache": list(MODEL_CACHE.keys()),
        "modelos_en_cache_max": MODEL_CACHE_MAX,
        "productos_con_historico_cacheado": list(DATOS_REALES_CACHE.keys()),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
