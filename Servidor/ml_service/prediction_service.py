from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import numpy as np
import pandas as pd
import tensorflow as tf
import joblib
import os
import warnings
warnings.filterwarnings("ignore")

app = FastAPI(
    title="Agro Inferencia API",
    description="Motor predictivo optimizado basado en redes recurrentes LSTM v7.12 para precios agrícolas",
    version="7.12"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # luego puedes restringir a tu dominio del frontend
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIONES GLOBALES REPLICADAS DEL MODELO ORIGINAL
# ══════════════════════════════════════════════════════════════════════════════
TARGET = "precio_promedio"
WINDOW_SIZE = 60
MODELS_DIR = "./model_artifacts"

HORIZONTES_VALIDOS = [1, 7, 30]

N_BOOTSTRAP = 15
RUIDO_FRAC_STD = 0.01  # 1% de la desviación histórica de cada variable cruda

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

# Cache en memoria para evitar accesos repetitivos a disco (I/O)
MODEL_CACHE = {}

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
    pred_sc = model.predict(X_inf, verbose=0)[0, 0]
    pred_inv = scaler_target.inverse_transform([[pred_sc]])[0, 0]
    pred_cop = float(precio_base_cop) * np.exp(pred_inv) if usar_diff else pred_inv
    
    col_std = datos_raw_base.std(axis=0)
    col_std[col_std == 0] = 1e-9  # evita ruido nulo en columnas constantes

    preds_boot = []
    for _ in range(N_BOOTSTRAP):
        noise = np.random.normal(0, RUIDO_FRAC_STD * col_std, datos_raw_base.shape)
        datos_raw_noisy = datos_raw_base + noise

        X_boot = _transformar_ventana(datos_raw_noisy, scaler_full, feat_idx_h, ops_agr_h, h, modo, window_base)
        p_sc = model.predict(X_boot, verbose=0)[0, 0]
        p_inv = scaler_target.inverse_transform([[p_sc]])[0, 0]
        p_cop = float(precio_base_cop) * np.exp(p_inv) if usar_diff else p_inv

        if np.isfinite(p_cop):
            preds_boot.append(p_cop)
    
    if len(preds_boot) < 2:
        # Bootstrap degenerado (todas las muestras cayeron no-finitas):
        # no hay base para estimar dispersión, colapsamos el IC al punto.
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

    # Sincronización de fecha destino
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
    """Carga los modelos en memoria una sola vez para optimizar las llamadas."""
    cache_key = f"{modelo_key}_h{h}"
    if cache_key in MODEL_CACHE:
        return MODEL_CACHE[cache_key]

    try:
        model_path = os.path.join(MODELS_DIR, f"best_{modelo_key}_h{h}.keras")
        sf_path = os.path.join(MODELS_DIR, f"scaler_full_{modelo_key}.pkl")
        st_path = os.path.join(MODELS_DIR, f"scaler_target_{modelo_key}.pkl")
        
        if not os.path.exists(model_path) or not os.path.exists(sf_path) or not os.path.exists(st_path):
            raise FileNotFoundError(
                f"Faltan archivos binarios de la red neuronal o scalers para "
                f"modelo_key='{modelo_key}' y horizonte h={h}."
            )
            
        model = tf.keras.models.load_model(model_path)
        scaler_full = joblib.load(sf_path)
        scaler_target = joblib.load(st_path)
        
        # Guardar en cache para futuros requests
        MODEL_CACHE[cache_key] = (model, scaler_full, scaler_target)
        return model, scaler_full, scaler_target
    except Exception as e:
        raise RuntimeError(f"Error crítico cargando la arquitectura del modelo: {str(e)}")

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

    try:
        # Cargar con caché optimizada
        model, scaler_full, scaler_target = cargar_artefactos_con_cache(producto, horizonte)
        
        # Generar histórico simulado
        # periods=95 para garantizar margen suficiente incluso en escenarios
        # con DIFERENCIAR=True (se pierde 1 registro) y horizontes largos (h=30).
        idx = pd.date_range(end=pd.Timestamp.now(), periods=95, freq='D')
        df_reciente = pd.DataFrame({
            "precio_promedio": np.random.uniform(2300, 2600, 95),
            "tmedia_c": np.random.uniform(14, 18, 95),
            "tmedia_c_lag20": np.random.uniform(14, 18, 95),
            "prec30_mm": np.random.uniform(10, 60, 95),
            "Cant_Ton_Total": np.random.uniform(150, 350, 95),
            "costo_total": np.random.uniform(1500, 2200, 95)
        }, index=idx)

        # Inyectar inputs del cliente en el último registro ("El presente")
        if precio_promedio is not None: df_reciente.iloc[-1, df_reciente.columns.get_loc("precio_promedio")] = precio_promedio
        if tmedia_c is not None:        df_reciente.iloc[-1, df_reciente.columns.get_loc("tmedia_c")] = tmedia_c
        if tmedia_c_lag20 is not None:  df_reciente.iloc[-1, df_reciente.columns.get_loc("tmedia_c_lag20")] = tmedia_c_lag20
        if prec30_mm is not None:       df_reciente.iloc[-1, df_reciente.columns.get_loc("prec30_mm")] = prec30_mm
        if Cant_Ton_Total is not None:  df_reciente.iloc[-1, df_reciente.columns.get_loc("Cant_Ton_Total")] = Cant_Ton_Total
        if costo_total is not None:     df_reciente.iloc[-1, df_reciente.columns.get_loc("costo_total")] = costo_total

        df_reciente = df_reciente.interpolate(method="time").ffill().bfill()
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
