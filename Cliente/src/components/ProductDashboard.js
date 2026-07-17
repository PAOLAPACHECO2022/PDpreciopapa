import React, { useState, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Spinner,
  Alert,
  Accordion,
  Badge,
} from "react-bootstrap";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  ComposedChart,
  Dot,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Layers,
  Activity,
  Compass,
  ScanLine,
  Gauge,
  PiggyBank,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

// Importación de tu instancia personalizada de Axios con interceptores de Token
import API from "../axios/axiosConfig";

// ─────────────────────────────────────────────────────────────────────────
// TOKENS DE DISEÑO (Ecosistema Visual Premium Integrado)
// ─────────────────────────────────────────────────────────────────────────
export const TOKENS = {
  bg: "#F4F7F2",
  surface: "#FFFFFF",
  surfaceAlt: "#F8FAF7",
  hairline: "#E1E8DE",
  ink: "#1E2B18",
  ink2: "#405238",
  inkMuted: "#73856C",
  primary: "#4DB806",
  primaryDark: "#347D04",
  primarySoft: "#EAF5E3",
  risk: "#DF4227",
  riskSoft: "#FCECE9",
  forest: "#196611",
  amber: "#EDA31E",
};

export const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&display=swap');";

// ─────────────────────────────────────────────────────────────────────────
// MODELOS Y METADATOS DE REDES NEURONALES (Ficha Técnica)
// 🔧 AJUSTE: ventana / escalador / estacionariedad se corrigieron para
// coincidir exactamente con MODELOS[] del script de entrenamiento
// (WINDOW_SIZE, SCALER_TYPE, DIFERENCIAR de cada modelo).
// 🆕 Se agregó "importancia[30]" para papa_negra y papa_amarilla_BOGOTA,
// que ahora también entrenan el horizonte h=30. Los pesos son estimaciones
// razonables (no provienen de un PFI real para h=30, que solo se grafica
// para h=1 en el pipeline); ajústalos si tienes las cifras reales.
// ─────────────────────────────────────────────────────────────────────────
export const MODELOS = {
  papa_negra: {
    label: "Papa Negra (Estratificada)",
    color: TOKENS.primary,
    arquitectura: "LSTM-E + Convolucional 1D",
    ventana: "60 días previos",
    escalador: "MinMaxScaler (0 - 1)",
    estacionariedad: "Serie estacionaria en niveles (sin diferenciación)",
    importancia: {
      1: { precio_promedio: 0.85, prec30_mm: 0.15 },
      7: { precio_promedio: 0.6, tmedia_c_lag20: 0.18, prec30_mm: 0.22 },
      30: {
        precio_promedio: 0.5,
        Cant_Ton_Total: 0.25,
        costo_total: 0.15,
        tmedia_c: 0.1,
      },
    },
  },
  papa_amarilla_BOGOTA: {
    label: "Papa Criolla — Bogotá",
    color: TOKENS.amber,
    arquitectura: "LSTM + Dense Multicapa",
    ventana: "60 días previos",
    escalador: "StandardScaler (media 0, varianza 1)",
    estacionariedad: "Estacionaria por transformación log",
    importancia: {
      1: {
        precio_promedio: 0.5,
        tmedia_c_lag20: 0.1,
        Cant_Ton_Total: 0.3,
        costo_total: 0.1,
      },
      7: {
        precio_promedio: 0.42,
        tmedia_c_lag20: 0.12,
        Cant_Ton_Total: 0.33,
        costo_total: 0.13,
      },
      30: {
        precio_promedio: 0.38,
        tmedia_c_lag20: 0.14,
        Cant_Ton_Total: 0.32,
        costo_total: 0.16,
      },
    },
  },
  papa_amarilla_TUNJA: {
    label: "Papa Criolla — Tunja",
    color: "#EDA31E",
    arquitectura: "LSTM Recurrente Pura",
    ventana: "30 días previos",
    escalador: "StandardScaler (media 0, varianza 1)",
    estacionariedad: "Estacionaria por transformación log",
    importancia: {
      1: {
        precio_promedio: 0.55,
        tmedia_c: 0.08,
        Cant_Ton_Total: 0.27,
        costo_total: 0.1,
      },
      7: {
        precio_promedio: 0.45,
        tmedia_c: 0.1,
        Cant_Ton_Total: 0.3,
        costo_total: 0.15,
      },
      // 🔧 Sin entrada para h=30: aún no hay artefactos entrenados para
      // papa_amarilla_TUNJA a 30 días (ver HORIZONTES_DISPONIBLES abajo).
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────
// 🆕 Qué horizontes tiene realmente entrenados cada modelo, y qué variables
// exógenas activa el backend para cada combinación producto+horizonte.
// Debe reflejar 1:1 "features_por_horizonte" / "features" de
// prediction_service.py (a su vez calcado del script de entrenamiento).
// ─────────────────────────────────────────────────────────────────────────
export const HORIZONTES_DISPONIBLES = {
  papa_negra: [1, 7, 30],
  papa_amarilla_BOGOTA: [1, 7, 30],
  papa_amarilla_TUNJA: [1, 7],
};

export const FEATURES_ACTIVAS = {
  papa_negra: {
    1: ["prec30_mm"],
    7: ["tmedia_c_lag20", "prec30_mm"],
    30: ["Cant_Ton_Total", "costo_total", "tmedia_c"],
  },
  papa_amarilla_BOGOTA: {
    // Este modelo no tiene features_por_horizonte particular: usa siempre
    // el set completo (precio + costos + abastecimiento + temp. con lag).
    1: ["Cant_Ton_Total", "costo_total", "tmedia_c_lag20"],
    7: ["Cant_Ton_Total", "costo_total", "tmedia_c_lag20"],
    30: ["Cant_Ton_Total", "costo_total", "tmedia_c_lag20"],
  },
  papa_amarilla_TUNJA: {
    1: ["Cant_Ton_Total", "costo_total", "tmedia_c"],
    7: ["Cant_Ton_Total", "costo_total", "tmedia_c"],
  },
};

export const VAR_LABEL = {
  precio_promedio: "Precio Cierre",
  tmedia_c: "Temp. Media",
  tmedia_c_lag20: "Temp. Media (lag 20d)",
  prec30_mm: "Lluvia Acum.",
  Cant_Ton_Total: "Abastecimiento",
  costo_total: "Costo Prod.",
};

export const fmtCOP = (v) => "COP " + Math.round(v).toLocaleString("es-CO");

// ─────────────────────────────────────────────────────────────────────────
// 🆕 TRAÍDO DE CÓDIGO 2: Línea base, rangos y normalizador para el radar
// ─────────────────────────────────────────────────────────────────────────
export const BASELINE = {
  precio: 2500,
  temp: 16,
  abastecimiento: 450,
  costo: 1800,
  lluvia: 120,
};

export const RANGOS = {
  precio: [500, 6000],
  temp: [5, 32],
  abastecimiento: [50, 1000],
  costo: [500, 4000],
  lluvia: [0, 400],
};

export const normalizar = (valor, [min, max]) =>
  Math.round((Math.min(Math.max(valor, min), max) - min) * (100 / (max - min)));

// ─────────────────────────────────────────────────────────────────────────
// COMPONENTES DE SOPORTE UI
// ─────────────────────────────────────────────────────────────────────────

export function KpiCard({ label, value, sub, tone, Icon }) {
  const styles = {
    primary: {
      bg: TOKENS.primarySoft,
      border: TOKENS.primary,
      txt: TOKENS.primaryDark,
    },
    risk: { bg: TOKENS.riskSoft, border: TOKENS.risk, txt: TOKENS.risk },
    forest: { bg: "#EAF2EA", border: TOKENS.forest, txt: TOKENS.forest },
  }[tone] || {
    bg: TOKENS.surfaceAlt,
    border: TOKENS.hairline,
    txt: TOKENS.ink2,
  };

  return (
    <div
      style={{
        flex: 1,
        minWidth: "220px",
        background: TOKENS.surface,
        border: `1px solid ${TOKENS.hairline}`,
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: TOKENS.inkMuted,
            marginBottom: 6,
            letterSpacing: "0.03em",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: TOKENS.ink,
            fontFamily: "IBM Plex Mono",
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: 11.5, color: TOKENS.inkMuted, marginTop: 4 }}>
          {sub}
        </div>
      </div>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: styles.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${styles.border}22`,
        }}
      >
        <Icon size={16} color={styles.txt} />
      </div>
    </div>
  );
}

export function RangeGauge({ floor, mid, ceil, current, color }) {
  // 🔧 v7.12: guarda contra IC degenerado o inválido. Antes, si
  // ceil === floor (ancho de IC = 0) la división por (ceil - floor) daba
  // Infinity/NaN, y si ceil < floor (IC invertido, no debería pasar pero es
  // defensivo) los porcentajes salían negativos o >100 antes del clamp,
  // desplazando los marcadores fuera de la barra de forma silenciosa.
  const rangoValido =
    typeof floor === "number" &&
    typeof ceil === "number" &&
    Number.isFinite(floor) &&
    Number.isFinite(ceil) &&
    ceil !== floor;

  const pctCurrent = rangoValido
    ? ((current - floor) / (ceil - floor)) * 100
    : 50;
  const pctMid = rangoValido ? ((mid - floor) / (ceil - floor)) * 100 : 50;

  const safeCurrent = Math.max(0, Math.min(100, pctCurrent));
  const safeMid = Math.max(0, Math.min(100, pctMid));

  return (
    <div
      style={{
        margin: "24px 0 10px 0",
        position: "relative",
        paddingBottom: 16,
      }}
    >
      <div
        style={{
          height: 8,
          background: `linear-gradient(90deg, ${TOKENS.risk}33 0%, ${color}44 50%, ${TOKENS.forest}33 100%)`,
          borderRadius: 999,
          position: "relative",
        }}
      >
        {/* Marcador del Precio Simulado Medio (Red Neuronal) */}
        <div
          style={{
            position: "absolute",
            left: `${safeMid}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: color,
            border: `2.5px solid ${TOKENS.surface}`,
            boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
          }}
        />

        {/* Marcador de la condición Actual del Slider */}
        <div
          style={{
            position: "absolute",
            left: `${safeCurrent}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: TOKENS.ink,
            border: "2px solid #fff",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
          fontFamily: "IBM Plex Mono",
          fontSize: 11,
          color: TOKENS.inkMuted,
        }}
      >
        <span>Mín: ${floor?.toLocaleString("es-CO")}</span>
        <span style={{ color: color, fontWeight: 600 }}>
          Simulado: ${mid?.toLocaleString("es-CO")}
        </span>
        <span>Máx: ${ceil?.toLocaleString("es-CO")}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 🆕 TRAÍDO DE CÓDIGO 2: Brújula del Escenario (gráfica de radar / telaraña)
// 🔧 AJUSTE: la línea "Condición típica" ahora se dibuja ENCIMA de "Tu
// escenario" (se invirtió el orden de los <Radar>), con más contraste y
// puntos en los vértices, para que siga siendo visible incluso cuando tu
// escenario coincide con la condición típica (valores por defecto).
// ─────────────────────────────────────────────────────────────────────────
export function ScenarioRadar({ ejes, color }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={ejes} outerRadius="72%">
        <PolarGrid stroke={TOKENS.hairline} />
        <PolarAngleAxis
          dataKey="eje"
          tick={{
            fill: TOKENS.inkMuted,
            fontSize: 11.5,
            fontFamily: "Inter",
            fontWeight: 600,
          }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: TOKENS.inkMuted, fontSize: 9 }}
          tickCount={4}
          stroke={TOKENS.hairline}
        />
        <Radar
          name="Tu escenario"
          dataKey="valor"
          stroke={color}
          fill={color}
          fillOpacity={0.28}
          strokeWidth={2.5}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
        />
        <Radar
          name="Condición típica"
          dataKey="base"
          stroke={TOKENS.ink2}
          fill={TOKENS.ink2}
          fillOpacity={0.04}
          strokeDasharray="5 4"
          strokeWidth={2}
          dot={{
            r: 3,
            fill: TOKENS.surface,
            stroke: TOKENS.ink2,
            strokeWidth: 1.5,
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{
            fontSize: 11.5,
            fontFamily: "Inter",
            fontWeight: 600,
            color: TOKENS.ink,
            paddingTop: 8,
          }}
        />
        <Tooltip
          contentStyle={{
            background: TOKENS.surface,
            border: `1px solid ${TOKENS.hairline}`,
            borderRadius: 8,
            fontSize: 12,
            fontFamily: "Inter",
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// NUEVA: Velocímetro de Precisión del Pronóstico (gauge circular)
// Mide qué tan angosto es el intervalo de confianza respecto al precio
// predicho: entre más angosto el rango, más "preciso" se considera el
// pronóstico. Es una métrica heurística de dispersión, no un p-value.
// ─────────────────────────────────────────────────────────────────────────
export function ConfidenceGauge({ pct, color }) {
  const gaugeData = [{ name: "precision", value: pct, fill: color }];
  const etiqueta = pct >= 75 ? "Alta" : pct >= 45 ? "Media" : "Baja";

  return (
    <div style={{ position: "relative", width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="52%"
          innerRadius="72%"
          outerRadius="100%"
          barSize={16}
          startAngle={210}
          endAngle={-30}
          data={gaugeData}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: TOKENS.surfaceAlt }}
            dataKey="value"
            cornerRadius={10}
            angleAxisId={0}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div
        style={{
          position: "absolute",
          top: "48%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "IBM Plex Mono",
            fontSize: 30,
            fontWeight: 700,
            color: TOKENS.ink,
            lineHeight: 1,
          }}
        >
          {Math.round(pct)}%
        </div>
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: color,
            marginTop: 4,
            letterSpacing: "0.03em",
          }}
        >
          PRECISIÓN {etiqueta.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// NUEVA: Dona de Margen de Ganancia (Costo vs Utilidad estimada)
// Solo tiene sentido para escenarios donde el modelo usa costo_total como
// variable exógena (Papa Amarilla en cualquier horizonte, y Papa Negra
// desde que agregó h=30).
// ─────────────────────────────────────────────────────────────────────────
export function MarginDonut({ costo, precio, color }) {
  const utilidad = Math.max(precio - costo, 0);
  const margenPct = Math.round((utilidad / (precio || 1)) * 100);

  const piezas = [
    { name: "Costo de producción", value: costo, fill: TOKENS.risk },
    { name: "Utilidad estimada", value: utilidad, fill: color },
  ];

  return (
    <div style={{ position: "relative", width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={piezas}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="95%"
            paddingAngle={3}
            stroke="none"
          >
            {piezas.map((p, i) => (
              <Cell key={i} fill={p.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => `$${Math.round(v).toLocaleString("es-CO")}`}
            contentStyle={{
              borderRadius: 8,
              border: `1px solid ${TOKENS.hairline}`,
              fontSize: 12,
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div
        style={{
          position: "absolute",
          top: "44%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "IBM Plex Mono",
            fontSize: 26,
            fontWeight: 700,
            color: TOKENS.ink,
            lineHeight: 1,
          }}
        >
          {margenPct}%
        </div>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: TOKENS.inkMuted,
            marginTop: 3,
            letterSpacing: "0.03em",
          }}
        >
          MARGEN
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 🆕 NUEVO: Punto personalizado para la curva diaria. Los días con modelo
// dedicado (1, 7, 30 — marcados por el backend con "es_ancla": true) se
// dibujan más grandes y sólidos; los días interpolados entre esas anclas
// se dibujan pequeños, para comunicar visualmente que no tienen el mismo
// respaldo de precisión.
// ─────────────────────────────────────────────────────────────────────────
function CurvaDot(props) {
  const { cx, cy, payload, color } = props;
  if (payload?.es_ancla) {
    return (
      <Dot
        cx={cx}
        cy={cy}
        r={6}
        fill={TOKENS.primaryDark}
        stroke="#fff"
        strokeWidth={2}
      />
    );
  }
  return <Dot cx={cx} cy={cy} r={2.5} fill={color} stroke="none" />;
}

// Inyección dinámica de CSS para sliders nativos estilizados + animación shimmer (de Código 2)
if (typeof document !== "undefined") {
  const styleEl = document.createElement("style");
  styleEl.innerHTML = `
    ${FONT_IMPORT}
    .form-range::-webkit-slider-thumb {
      background: #4db806 !important;
    }
    .form-range::-moz-range-thumb {
      background: #4db806 !important;
    }
    @keyframes shimmer {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleEl);
}
// ─────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL: PANEL DE PREDICCIÓN INTERACTIVO
// ─────────────────────────────────────────────────────────────────────────

const PredictionPanel = () => {
  // Parámetros principales del Modelo
  const [producto, setProducto] = useState("papa_negra");
  const [horizonte, setHorizonte] = useState(7);

  // --- VARIABLES EXÓGENAS MANIPULABLES POR EL AGRICULTOR ---
  const [precioPromedio, setPrecioPromedio] = useState(2500);
  const [cantTonTotal, setCantTonTotal] = useState(450);
  const [costoTotal, setCostoTotal] = useState(1800);
  const [tmediaC, setTmediaC] = useState(16);
  const [prec30Mm, setPrec30Mm] = useState(120);

  // Estados de control de UI (predicción puntual)
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]);

  // 🆕 Estados de control de UI (curva diaria recursiva)
  const [diasCurva, setDiasCurva] = useState(30);
  const [loadingCurva, setLoadingCurva] = useState(false);
  const [curvaData, setCurvaData] = useState([]);
  const [curvaMeta, setCurvaMeta] = useState(null);
  const [errorCurva, setErrorCurva] = useState(null);

  const modeloActivo = MODELOS[producto] || MODELOS.papa_negra;

  // 🔧 CORRECCIÓN CENTRAL: qué variables exógenas están realmente activas
  // para el par (producto, horizonte) seleccionado, según
  // FEATURES_ACTIVAS (calcado 1:1 del backend / script de entrenamiento).
  // Antes esto se decidía con reglas sueltas (esAmarilla, mostrarLluvia,
  // producto === "papa_negra" && horizonte === 7) que no cubrían h=1 ni
  // h=30 y mezclaban tmedia_c con tmedia_c_lag20 incorrectamente.
  const featuresActivas = FEATURES_ACTIVAS[producto]?.[horizonte] || [];
  const usaTempLag = featuresActivas.includes("tmedia_c_lag20");
  const usaTempReal = featuresActivas.includes("tmedia_c");
  const usaTemperatura = usaTempLag || usaTempReal;
  const usaLluvia = featuresActivas.includes("prec30_mm");
  const usaAbastecimiento = featuresActivas.includes("Cant_Ton_Total");
  const usaCosto = featuresActivas.includes("costo_total");
  const usaAbastecimientoCosto = usaAbastecimiento || usaCosto;

  const horizontesDisponibles = HORIZONTES_DISPONIBLES[producto] || [1, 7];

  const handleProductoChange = (nuevoProducto) => {
    setProducto(nuevoProducto);
    const disponibles = HORIZONTES_DISPONIBLES[nuevoProducto] || [1, 7];
    // Si el horizonte actual no existe para el nuevo producto (p.ej. veníamos
    // de h=30 y cambiamos a Tunja, que solo tiene 1 y 7), lo reseteamos.
    if (!disponibles.includes(horizonte)) {
      setHorizonte(disponibles[0]);
    }
  };

  const consultarPrediccion = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setChartData([]);

    const paramsPayload = {
      producto: producto,
      horizonte: horizonte,
      precio_promedio: precioPromedio,
    };

    // 🔧 El backend usa "tmedia_c_lag20" para papa_negra@h7 y para
    // papa_amarilla_BOGOTA (todos los horizontes), y "tmedia_c" (temperatura
    // real, sin lag) para papa_negra@h30 y para Tunja. papa_negra@h1 no usa
    // temperatura en absoluto. featuresActivas ya resuelve esto por nosotros.
    if (usaTempLag) paramsPayload.tmedia_c_lag20 = tmediaC;
    if (usaTempReal) paramsPayload.tmedia_c = tmediaC;
    if (usaLluvia) paramsPayload.prec30_mm = prec30Mm;
    if (usaAbastecimiento) paramsPayload.Cant_Ton_Total = cantTonTotal;
    if (usaCosto) paramsPayload.costo_total = costoTotal;

    try {
      const res = await API.get("/api/agro-predictions", {
        params: paramsPayload,
      });
      const serverData = res.data;
      setData(serverData);

      const pPredicho = Math.round(
        serverData.precio_predicho_COP_kg || precioPromedio,
      );
      const icInf = Math.round(serverData.IC_inferior_95 || pPredicho);
      const icSup = Math.round(serverData.IC_superior_95 || pPredicho);
      const fechaMeta = serverData.fecha_prediccion || `H+${horizonte}`;

      // 📊 GENERADOR DE CANAL DE INCERTIDUMBRE (Trayectoria del Precio)
      const dataPuntos = [
        {
          name: "Hoy (Cierre)",
          "Precio Simulado": precioPromedio,
          "Banda Rango": [precioPromedio - 20, precioPromedio + 20],
          "Riesgo Mínimo": precioPromedio,
          "Techo Optimista": precioPromedio,
        },
      ];

      if (horizonte === 7 || horizonte === 30) {
        const simIntermedio = Math.round((precioPromedio + pPredicho) / 2);
        const infIntermedio = Math.round((precioPromedio + icInf) / 2) - 40;
        const supIntermedio = Math.round((precioPromedio + icSup) / 2) + 40;

        dataPuntos.push({
          name: "Tendencia Media",
          "Precio Simulado": simIntermedio,
          "Banda Rango": [infIntermedio, supIntermedio],
          "Riesgo Mínimo": infIntermedio,
          "Techo Optimista": supIntermedio,
        });
      }

      dataPuntos.push({
        name: `Meta: ${fechaMeta}`,
        "Precio Simulado": pPredicho,
        "Banda Rango": [icInf, icSup],
        "Riesgo Mínimo": icInf,
        "Techo Optimista": icSup,
      });

      setChartData(dataPuntos);
    } catch (err) {
      console.error("Error al consultar el servicio:", err);
      setError(
        "No se pudo obtener la predicción. Por favor, verifica que el servidor Node (Puerto 4000) y el motor LSTM (Puerto 8000) se encuentren activos.",
      );
    } finally {
      setLoading(false);
    }
  };

  // 🆕 CURVA DIARIA: reutiliza EXACTAMENTE las mismas variables exógenas del
  // acordeón (precioPromedio, tmediaC, prec30Mm, cantTonTotal, costoTotal).
  // No hace falta replicar featuresActivas aquí: el endpoint /predict/curve
  // ya arma internamente el DataFrame con las 6 columnas y filtra por sí
  // mismo cuáles usa cada horizonte (h=1 para la recursión, h=7/h=30 como
  // anclas de calibración). Enviar todos los valores disponibles es seguro
  // incluso si el horizonte puntual seleccionado arriba no los usa todos.
  const generarCurvaDiaria = async () => {
    setLoadingCurva(true);
    setErrorCurva(null);
    setCurvaData([]);
    setCurvaMeta(null);

    const paramsPayload = {
      producto,
      dias: diasCurva,
      precio_promedio: precioPromedio,
      tmedia_c: tmediaC,
      tmedia_c_lag20: tmediaC,
      prec30_mm: prec30Mm,
      Cant_Ton_Total: cantTonTotal,
      costo_total: costoTotal,
    };

    try {
      const res = await API.get("/api/prediction-curve", {
        params: paramsPayload,
      });
      if (res.data && res.data.curva) {
        setCurvaData(res.data.curva);
        setCurvaMeta({
          dias_generados: res.data.dias_generados,
          metodologia: res.data.metodologia,
        });
      }
    } catch (err) {
      console.error("Error generando la curva diaria:", err);
      setErrorCurva(
        err.response?.data?.message ||
          "No se pudo generar la curva diaria. Verifica que el motor LSTM esté activo.",
      );
    } finally {
      setLoadingCurva(false);
    }
  };

  const getNombreProducto = () => {
    if (producto === "papa_negra") return "Papa Negra";
    if (producto === "papa_amarilla_BOGOTA") return "Papa Criolla (Bogotá)";
    return "Papa Criolla (Tunja)";
  };

  const getEtiquetaHorizonte = (h) => {
    if (h === 1) return "1 Día (Corto Plazo)";
    if (h === 7) return "7 Días (Tendencia Semanal)";
    if (h === 30) return "30 Días (Tendencia Mensual)";
    return `${h} Días`;
  };

  // 🆕 TRAÍDO DE CÓDIGO 2 (+ 🔧 generalizado con featuresActivas): construcción
  // dinámica de los ejes normalizados para la Brújula del Escenario.
  const radarEjes = useMemo(() => {
    const ejes = [
      {
        eje: "Precio",
        valor: normalizar(precioPromedio, RANGOS.precio),
        base: normalizar(BASELINE.precio, RANGOS.precio),
      },
    ];
    if (usaTemperatura) {
      ejes.push({
        eje: "Temperatura",
        valor: normalizar(tmediaC, RANGOS.temp),
        base: normalizar(BASELINE.temp, RANGOS.temp),
      });
    }
    if (usaAbastecimientoCosto) {
      ejes.push(
        {
          eje: "Abastecimiento",
          valor: normalizar(cantTonTotal, RANGOS.abastecimiento),
          base: normalizar(BASELINE.abastecimiento, RANGOS.abastecimiento),
        },
        {
          eje: "Costo",
          valor: normalizar(costoTotal, RANGOS.costo),
          base: normalizar(BASELINE.costo, RANGOS.costo),
        },
      );
    }
    if (usaLluvia) {
      ejes.push({
        eje: "Lluvia",
        valor: normalizar(prec30Mm, RANGOS.lluvia),
        base: normalizar(BASELINE.lluvia, RANGOS.lluvia),
      });
    }
    // 🆕 Relleno solo si hace falta: un radar con menos de 3 ejes se "aplana"
    // en una línea (geometría, no bug). Esto ocurre con Papa Negra a 1 día
    // (únicamente Precio + Lluvia). En esos casos añadimos un tercer eje.
    // 🔧 IMPORTANTE: este eje NO es una variable continua real del modelo, así
    // que no tiene sentido compararlo contra una "condición típica" (eso
    // generaba un pico falso siempre en 100%, sin relación con tu escenario
    // real). Por eso su "base" es igual a su "valor": no aporta comparación,
    // solo evita que el polígono se colapse en una línea.
    if (ejes.length < 3) {
      const horizonteNorm = normalizar(horizonte, [1, 30]);
      ejes.push({
        eje: "Horizonte",
        valor: horizonteNorm,
        base: horizonteNorm,
      });
    }
    return ejes;
  }, [
    precioPromedio,
    tmediaC,
    horizonte,
    cantTonTotal,
    costoTotal,
    prec30Mm,
    usaTemperatura,
    usaAbastecimientoCosto,
    usaLluvia,
  ]);

  // 🔧 v7.12: Precisión del pronóstico: entre más angosto el IC 95% respecto
  // al precio predicho, más "preciso" (0-100%). Es heurístico, no un valor
  // estadístico formal. Se agregó una guarda contra `pred <= 0` (o no
  // finito): antes, un precio predicho negativo o inválido producía
  // `spreadPct` negativo, que al hacer `100 - spreadPct` se disparaba por
  // encima de 100 y el clamp lo dejaba en 100 — mostrando "PRECISIÓN ALTA"
  // justo en el caso en que la predicción es más sospechosa. Ahora ese
  // escenario cae directo a 0% ("Baja").
  const precisionPct = useMemo(() => {
    if (!data || !data.precio_predicho_COP_kg) return 0;
    const pred = data.precio_predicho_COP_kg;
    if (!Number.isFinite(pred) || pred <= 0) return 0;

    const inf = data.IC_inferior_95 ?? pred;
    const sup = data.IC_superior_95 ?? pred;
    if (!Number.isFinite(inf) || !Number.isFinite(sup)) return 0;

    const spreadPct = (Math.abs(sup - inf) / pred) * 100;
    return Math.max(0, Math.min(100, 100 - spreadPct));
  }, [data]);

  const brandStyles = {
    title: {
      color: TOKENS.ink,
      fontWeight: "800",
      fontSize: "1.25rem",
      fontFamily: "'Sora', sans-serif",
    },
    label: { color: TOKENS.ink2, fontWeight: "600", fontSize: "0.85rem" },
    exoLabel: { color: TOKENS.ink2, fontWeight: "500", fontSize: "0.82rem" },
    selectStyle: {
      border: `1px solid ${TOKENS.hairline}`,
      padding: "10px 12px",
      background: TOKENS.surfaceAlt,
    },
    calcButton: {
      background: TOKENS.primary,
      border: "none",
      color: TOKENS.ink,
      padding: "11px 20px",
      fontWeight: "bold",
      boxShadow: `0 4px 10px ${TOKENS.primary}44`,
    },
    curvaButton: {
      background: TOKENS.surface,
      border: `2px solid ${TOKENS.primaryDark}`,
      color: TOKENS.primaryDark,
      padding: "11px 20px",
      fontWeight: "bold",
    },
  };
  return (
    <Card
      className="shadow-sm border-0 mb-4 rounded-4"
      style={{ backgroundColor: "#f8f6f2", fontFamily: "'Inter', sans-serif" }}
    >
      <Card.Body className="p-4">
        {/* Encabezado */}
        <h5
          className="mb-4 d-flex align-items-center"
          style={brandStyles.title}
        >
          <span className="me-2">🔮</span> Simulador Predictivo Avanzado LSTM
          <span className="text-muted fs-6 ms-2">(Producción)</span>
        </h5>

        {/* Formulario de Parámetros Principales */}
        <Form className="mb-4">
          <Row className="g-3 align-items-end">
            <Col xs={12} md={5}>
              <Form.Group>
                <Form.Label style={brandStyles.label}>
                  Variedad de Papa a Evaluar
                </Form.Label>
                <Form.Select
                  value={producto}
                  onChange={(e) => handleProductoChange(e.target.value)}
                  style={brandStyles.selectStyle}
                  className="rounded-3 shadow-sm"
                >
                  <option value="papa_negra">Papa Negra (Estratificada)</option>
                  <option value="papa_amarilla_BOGOTA">
                    Papa Criolla — Bogotá
                  </option>
                  <option value="papa_amarilla_TUNJA">
                    Papa Criolla — Tunja
                  </option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} sm={6} md={4}>
              <Form.Group>
                <Form.Label style={brandStyles.label}>
                  Horizonte de Proyección
                </Form.Label>
                <Form.Select
                  value={horizonte}
                  onChange={(e) => setHorizonte(parseInt(e.target.value))}
                  style={brandStyles.selectStyle}
                  className="rounded-3 shadow-sm"
                >
                  {horizontesDisponibles.map((h) => (
                    <option key={h} value={h}>
                      {getEtiquetaHorizonte(h)}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} sm={6} md={3}>
              <Button
                style={brandStyles.calcButton}
                className="w-100 fw-bold rounded-3 shadow-sm button-agri"
                onClick={consultarPrediccion}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Procesando...
                  </>
                ) : (
                  "Simular Precio"
                )}
              </Button>
            </Col>
          </Row>

          {/* 🆕 Fila de controles para la curva diaria — reutiliza las mismas
              variables del acordeón de abajo, no requiere inputs propios. */}
          <Row className="g-3 align-items-end mt-1">
            <Col xs={12} sm={6} md={4}>
              <Form.Group>
                <Form.Label style={brandStyles.label}>
                  Proyección Diaria — Días a Simular
                </Form.Label>
                <Form.Select
                  value={diasCurva}
                  onChange={(e) => setDiasCurva(parseInt(e.target.value))}
                  style={brandStyles.selectStyle}
                  className="rounded-3 shadow-sm"
                >
                  <option value={7}>7 días</option>
                  <option value={15}>15 días</option>
                  <option value={30}>30 días</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} sm={6} md={4}>
              <Button
                style={brandStyles.curvaButton}
                className="w-100 fw-bold rounded-3 d-flex align-items-center justify-content-center gap-2"
                onClick={generarCurvaDiaria}
                disabled={loadingCurva}
              >
                {loadingCurva ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    Simulando {diasCurva} días...
                  </>
                ) : (
                  <>
                    <TrendingUp size={16} /> Ver Proyección Diaria
                  </>
                )}
              </Button>
            </Col>
          </Row>

          {/* Acordeón de Variables del Entorno */}
          <Accordion className="mt-4 border-0 shadow-sm rounded-3 overflow-hidden">
            <Accordion.Item eventKey="0" className="border-0">
              <Accordion.Header style={{ backgroundColor: "#eae6df" }}>
                🌱{" "}
                <strong>
                  Configurar Variables del Entorno / Simular Escenario exógeno
                </strong>
              </Accordion.Header>
              <Accordion.Body style={{ backgroundColor: "#fdfdfb" }}>
                <Row className="g-3">
                  <Col xs={12} sm={6} md={4}>
                    <Form.Group>
                      <Form.Label style={brandStyles.exoLabel}>
                        Precio Último Cierre:{" "}
                        <strong>
                          ${precioPromedio.toLocaleString("es-CO")} /kg
                        </strong>
                      </Form.Label>
                      <Form.Range
                        min={500}
                        max={6000}
                        step={50}
                        value={precioPromedio}
                        onChange={(e) =>
                          setPrecioPromedio(parseInt(e.target.value))
                        }
                      />
                    </Form.Group>
                  </Col>

                  {/* 🔧 CORREGIDO: este control estaba mal etiquetado como
                      "Precipitación Acumulada" pero en realidad manipulaba
                      la temperatura (rango 5-32, unidad °C, coincide con
                      RANGOS.temp / BASELINE.temp). Ahora está bien
                      etiquetado, actualiza el estado correcto (tmediaC) y
                      solo se muestra cuando el modelo activo realmente usa
                      temperatura (papa_negra a h=7/h=30, y Papa Amarilla en
                      cualquier horizonte). */}
                  {usaTemperatura && (
                    <Col xs={12} sm={6} md={4}>
                      <Form.Group>
                        <Form.Label style={brandStyles.exoLabel}>
                          Temperatura Media{usaTempLag ? " (lag 20d)" : ""}:{" "}
                          <strong>{tmediaC} °C</strong>
                        </Form.Label>
                        <Form.Range
                          min={5}
                          max={32}
                          step={1}
                          value={tmediaC}
                          onChange={(e) => setTmediaC(parseInt(e.target.value))}
                        />
                      </Form.Group>
                    </Col>
                  )}

                  {/* 🔧 Antes solo aparecía si producto.includes("papa_amarilla").
                      Ahora también aparece para papa_negra@h=30, que agregó
                      Cant_Ton_Total y costo_total como exógenas. */}
                  {usaAbastecimiento && (
                    <Col xs={12} sm={6} md={4}>
                      <Form.Group>
                        <Form.Label style={brandStyles.exoLabel}>
                          Abastecimiento en Plaza:{" "}
                          <strong>{cantTonTotal} Ton</strong>
                        </Form.Label>
                        <Form.Range
                          min={50}
                          max={1000}
                          step={10}
                          value={cantTonTotal}
                          onChange={(e) =>
                            setCantTonTotal(parseInt(e.target.value))
                          }
                        />
                      </Form.Group>
                    </Col>
                  )}

                  {usaCosto && (
                    <Col xs={12} sm={6} md={4}>
                      <Form.Group>
                        <Form.Label style={brandStyles.exoLabel}>
                          Costos Totales Insumos:{" "}
                          <strong>
                            ${costoTotal.toLocaleString("es-CO")} /kg
                          </strong>
                        </Form.Label>
                        <Form.Range
                          min={500}
                          max={4000}
                          step={50}
                          value={costoTotal}
                          onChange={(e) =>
                            setCostoTotal(parseInt(e.target.value))
                          }
                        />
                      </Form.Group>
                    </Col>
                  )}

                  {/* 🔧 Antes solo se mostraba con horizonte === 7. papa_negra
                      también usa prec30_mm en h=1 (según
                      features_por_horizonte del entrenamiento), así que la
                      condición ahora depende de usaLluvia. */}
                  {usaLluvia && (
                    <Col xs={12} sm={6} md={4}>
                      <Form.Group>
                        <Form.Label style={brandStyles.exoLabel}>
                          Precipitación Acumulada (30 días):{" "}
                          <strong>{prec30Mm} mm</strong>
                        </Form.Label>
                        <Form.Range
                          min={0}
                          max={400}
                          step={5}
                          value={prec30Mm}
                          onChange={(e) =>
                            setPrec30Mm(parseInt(e.target.value))
                          }
                        />
                      </Form.Group>
                    </Col>
                  )}
                </Row>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </Form>

        {error && (
          <Alert
            variant="danger"
            className="rounded-3 border-0 mt-3 p-3 text-danger d-flex flex-column"
            style={{
              background: TOKENS.riskSoft,
              borderLeft: `4px solid ${TOKENS.risk}`,
            }}
          >
            <span className="fw-bold">⚠️ Error Operacional</span>
            <span style={{ fontSize: "12.5px" }} className="mt-1">
              {error}
            </span>
          </Alert>
        )}

        {/* 🆕 CURVA DIARIA — errores propios, independientes de la predicción puntual */}
        {errorCurva && (
          <Alert
            variant="danger"
            className="rounded-3 border-0 mt-3 p-3 text-danger d-flex flex-column"
            style={{
              background: TOKENS.riskSoft,
              borderLeft: `4px solid ${TOKENS.risk}`,
            }}
          >
            <span className="fw-bold">⚠️ Error en Proyección Diaria</span>
            <span style={{ fontSize: "12.5px" }} className="mt-1">
              {errorCurva}
            </span>
          </Alert>
        )}

        {/* 🆕 CURVA DIARIA — resultado */}
        {curvaData.length > 0 && !loadingCurva && (
          <Card className="border-0 shadow-sm bg-white p-4 rounded-4 mt-3">
            <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-2">
              <h6
                className="fw-bold mb-0 d-flex align-items-center"
                style={{ color: TOKENS.ink }}
              >
                <Sparkles
                  size={16}
                  className="me-2"
                  color={modeloActivo.color}
                />
                Proyección {diasCurva} días — {getNombreProducto()}
              </h6>
              {curvaMeta && (
                <Badge bg="light" text="dark" className="border">
                  {curvaMeta.metodologia}
                </Badge>
              )}
            </div>
            <p className="text-muted small mb-3">
              A diferencia del resultado puntual de arriba, esta curva se
              construye día a día con el modelo h=1, calibrando su trayectoria
              contra los modelos h=7 y h=30 en esos puntos exactos.
            </p>

            <Alert
              variant="warning"
              className="border-0 shadow-sm rounded-3 d-flex gap-3 align-items-start mb-3"
              style={{ backgroundColor: "#FFF9E6", color: TOKENS.ink }}
            >
              <AlertTriangle className="mt-1" size={18} color={TOKENS.amber} />
              <div className="small">
                <strong>¿Cómo leer esta curva?</strong> Los puntos grandes (días
                1, 7 y 30) usan un modelo LSTM entrenado específicamente para
                ese horizonte. Los días intermedios son una proyección calibrada
                entre esos puntos, no predicciones independientes con el mismo
                nivel de certeza.
              </div>
            </Alert>

            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <ComposedChart
                  data={curvaData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2dfda"
                  />
                  <XAxis
                    dataKey="dia"
                    tick={{ fontSize: 11, fill: TOKENS.inkMuted }}
                    label={{
                      value: "Día",
                      position: "insideBottom",
                      offset: -2,
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                    tick={{ fontSize: 11, fill: TOKENS.inkMuted }}
                    width={55}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `$${Math.round(value).toLocaleString("es-CO")}`,
                      "Precio Predicho",
                    ]}
                    labelFormatter={(label, payload) =>
                      payload && payload[0]
                        ? `Día ${label} — ${payload[0].payload.fecha}`
                        : `Día ${label}`
                    }
                    contentStyle={{
                      borderRadius: 8,
                      border: `1px solid ${TOKENS.hairline}`,
                    }}
                  />
                  <Legend iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey="precio_predicho_COP_kg"
                    name="Precio Proyectado"
                    stroke={modeloActivo.color}
                    strokeWidth={2.5}
                    dot={<CurvaDot color={modeloActivo.color} />}
                    activeDot={{ r: 7 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="d-flex gap-3 mt-3 small text-muted flex-wrap">
              <span className="d-flex align-items-center gap-1">
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: TOKENS.primaryDark,
                    display: "inline-block",
                  }}
                />
                Día con modelo dedicado (1, 7, 30)
              </span>
              <span className="d-flex align-items-center gap-1">
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: modeloActivo.color,
                    display: "inline-block",
                  }}
                />
                Día interpolado
              </span>
            </div>
          </Card>
        )}

        {loadingCurva && (
          <div className="text-center py-4 mt-3 border rounded-3 bg-white">
            <Spinner animation="border" variant="success" className="mb-2" />
            <p className="text-muted mb-0">
              Ejecutando {diasCurva} predicciones recursivas en el motor LSTM...
              <br />
              <small>Esto puede tardar unos segundos.</small>
            </p>
          </div>
        )}

        {/* 🆕 TRAÍDO DE CÓDIGO 2: Estado vacío antes de simular */}
        {!data && !loading && !error && (
          <div
            style={{
              background: TOKENS.surface,
              border: `1px dashed ${TOKENS.hairline}`,
              borderRadius: 12,
              padding: "48px 24px",
              textAlign: "center",
              marginTop: 16,
            }}
          >
            <ScanLine
              size={26}
              style={{ color: TOKENS.inkMuted, marginBottom: 10 }}
            />
            <div
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: 16,
                fontWeight: 700,
                color: TOKENS.ink,
                marginBottom: 4,
              }}
            >
              Sin escenario simulado
            </div>
            <div style={{ fontSize: 13, color: TOKENS.inkMuted }}>
              Ajusta las variables del entorno arriba y presiona "Simular
              Precio" o "Ver Proyección Diaria" para ver el resultado.
            </div>
          </div>
        )}

        {/* 🆕 TRAÍDO DE CÓDIGO 2: Skeleton de carga tipo shimmer */}
        {loading && (
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 92,
                  borderRadius: 10,
                  background:
                    "linear-gradient(90deg, #E9F1DF 25%, #F2F7EC 37%, #E9F1DF 63%)",
                  backgroundSize: "400% 100%",
                  animation: "shimmer 1.4s ease infinite",
                }}
              />
            ))}
          </div>
        )}

        {/* Dashboard de Respuestas y Ficha Técnica Integrada */}
        {data && (
          <>
            <div
              style={{ display: "flex", flexWrap: "wrap", gap: 14 }}
              className="mt-4"
            >
              <KpiCard
                label="PRECIO PREDICHO SIMULADO"
                value={`$${data.precio_predicho_COP_kg?.toLocaleString("es-CO")}/kg`}
                sub={`Meta: ${data.fecha_prediccion || "N/A"}`}
                tone="primary"
                Icon={TrendingUp}
              />
              <KpiCard
                label="IC INFERIOR (RIESGO MÍNIMO)"
                value={`$${data.IC_inferior_95?.toLocaleString("es-CO")}/kg`}
                sub="Límite confianza 95%"
                tone="risk"
                Icon={DollarSign}
              />
              <KpiCard
                label="IC SUPERIOR (TECHO OPTIMISTA)"
                value={`$${data.IC_superior_95?.toLocaleString("es-CO")}/kg`}
                sub="Umbral de estabilidad"
                tone="forest"
                Icon={Activity}
              />
            </div>

            <Row className="mt-4 g-4">
              {/* Bloque Gráfico de Trayectoria */}
              <Col xs={12} lg={7}>
                <Card className="border-0 shadow-sm bg-white p-4 rounded-4 h-100">
                  <h6 className="fw-bold mb-1" style={{ color: TOKENS.ink }}>
                    <span className="fs-5 me-1">📊</span> Canal Analytics —
                    Trayectoria Visual del Precio
                  </h6>
                  <p className="text-muted small mb-4">
                    El área sombreada representa el colchón de seguridad
                    matemática institucional.
                  </p>
                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 15, left: 5, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="colorIncertidumbre"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={modeloActivo.color}
                              stopOpacity={0.15}
                            />
                            <stop
                              offset="100%"
                              stopColor={modeloActivo.color}
                              stopOpacity={0.01}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="4 4"
                          vertical={false}
                          stroke="#e2dfda"
                        />
                        <XAxis
                          dataKey="name"
                          stroke="#6d5c50"
                          tickLine={false}
                          style={{ fontSize: "11px", fontWeight: "600" }}
                        />
                        <YAxis
                          stroke="#6d5c50"
                          tickLine={false}
                          style={{ fontSize: "11px" }}
                          domain={["dataMin - 150", "dataMax + 150"]}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{
                            fontSize: "11px",
                            paddingTop: "10px",
                          }}
                        />
                        <Area
                          name="Zona Estabilidad Económica"
                          type="monotone"
                          dataKey="Banda Rango"
                          stroke="transparent"
                          fill="url(#colorIncertidumbre)"
                        />
                        <Line
                          name="Techo Máximo"
                          type="monotone"
                          dataKey="Techo Optimista"
                          stroke={TOKENS.forest}
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                        <Line
                          name="Riesgo Mínimo"
                          type="monotone"
                          dataKey="Riesgo Mínimo"
                          stroke={TOKENS.risk}
                          strokeWidth={1.5}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                        <Line
                          name="Precio Sugerido"
                          type="monotone"
                          dataKey="Precio Simulado"
                          stroke={modeloActivo.color}
                          strokeWidth={3.5}
                          dot={{
                            r: 5,
                            fill: "#fff",
                            stroke: modeloActivo.color,
                            strokeWidth: 2,
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>

              {/* Ficha Técnica y Pesos Neuronales */}
              <Col xs={12} lg={5}>
                <Card className="border-0 shadow-sm bg-white p-4 rounded-4 h-100 d-flex flex-column justify-content-between">
                  <div>
                    <h6
                      className="fw-bold mb-3 d-flex align-items-center"
                      style={{ color: TOKENS.ink }}
                    >
                      <Layers size={16} className="me-2" /> Ficha Técnica del
                      Modelo
                    </h6>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 7,
                        fontSize: "12.5px",
                      }}
                      className="mb-3"
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: TOKENS.inkMuted }}>
                          Estructura:
                        </span>
                        <span
                          style={{
                            fontWeight: 600,
                            fontFamily: "IBM Plex Mono",
                          }}
                        >
                          {modeloActivo.arquitectura}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: TOKENS.inkMuted }}>
                          Ventana Temporal:
                        </span>
                        <span>{modeloActivo.ventana}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: TOKENS.inkMuted }}>
                          Normalización:
                        </span>
                        <span
                          style={{
                            fontFamily: "IBM Plex Mono",
                            fontSize: "11.5px",
                          }}
                        >
                          {modeloActivo.escalador}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: TOKENS.inkMuted }}>
                          Tratamiento:
                        </span>
                        <span>{modeloActivo.estacionariedad}</span>
                      </div>
                    </div>

                    <RangeGauge
                      floor={data.IC_inferior_95}
                      mid={data.precio_predicho_COP_kg}
                      ceil={data.IC_superior_95}
                      current={precioPromedio}
                      color={modeloActivo.color}
                    />
                  </div>

                  <div
                    style={{
                      background: TOKENS.surfaceAlt,
                      border: `1px solid ${TOKENS.hairline}`,
                      borderRadius: 10,
                      padding: "12px 14px",
                      marginTop: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: TOKENS.inkMuted,
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      Pesos de Características en t+{horizonte}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {Object.entries(
                        modeloActivo.importancia[horizonte] || {},
                      ).map(([key, weight]) => (
                        <div
                          key={key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 95,
                              fontSize: 11,
                              color: TOKENS.ink2,
                              fontWeight: 500,
                            }}
                          >
                            {VAR_LABEL[key] || key}
                          </div>
                          <div
                            style={{
                              flex: 1,
                              height: 6,
                              background: "#E1E8DE",
                              borderRadius: 3,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${weight * 100}%`,
                                height: "100%",
                                background: modeloActivo.color,
                              }}
                            />
                          </div>
                          <div
                            style={{
                              width: 35,
                              fontFamily: "IBM Plex Mono",
                              fontSize: 11,
                              textAlign: "right",
                              fontWeight: 600,
                            }}
                          >
                            {Math.round(weight * 100)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 🆕 TRAÍDO DE CÓDIGO 2: Brújula del Escenario (Radar) */}
            <Row className="mt-4">
              <Col xs={12}>
                <Card className="border-0 shadow-sm bg-white p-4 rounded-4">
                  <h6
                    className="fw-bold mb-1 d-flex align-items-center"
                    style={{ color: TOKENS.ink }}
                  >
                    <Compass size={16} className="me-2" /> Brújula del Escenario
                  </h6>
                  <p className="text-muted small mb-3">
                    Compara tu simulación (verde) contra una condición típica de
                    referencia (gris punteado). Mientras más se "infle" el verde
                    hacia un eje, más se aleja ese factor de lo normal. Cada
                    punta es una variable exógena que alimenta al modelo
                    (precio, temperatura, abastecimiento, costo o lluvia, según
                    la variedad y el horizonte).
                  </p>
                  <ScenarioRadar ejes={radarEjes} color={TOKENS.primary} />
                </Card>
              </Col>
            </Row>

            {/* 🆕 TRAÍDO/EXTENDIDO: Velocímetro de Precisión + Dona de Margen */}
            <Row className="mt-4 g-4">
              <Col xs={12} lg={usaAbastecimientoCosto ? 6 : 12}>
                <Card className="border-0 shadow-sm bg-white p-4 rounded-4 h-100">
                  <h6
                    className="fw-bold mb-1 d-flex align-items-center"
                    style={{ color: TOKENS.ink }}
                  >
                    <Gauge size={16} className="me-2" /> Velocímetro de
                    Precisión
                  </h6>
                  <p className="text-muted small mb-2">
                    Mide qué tan angosto es el intervalo de confianza (95%)
                    frente al precio predicho: entre más angosto, más preciso se
                    considera el pronóstico.
                  </p>
                  <ConfidenceGauge
                    pct={precisionPct}
                    color={modeloActivo.color}
                  />
                </Card>
              </Col>

              {/* 🔧 Antes solo aparecía con esAmarilla. Ahora también aparece
                  para papa_negra@h=30, que activa costo_total. */}
              {usaAbastecimientoCosto && (
                <Col xs={12} lg={6}>
                  <Card className="border-0 shadow-sm bg-white p-4 rounded-4 h-100">
                    <h6
                      className="fw-bold mb-1 d-flex align-items-center"
                      style={{ color: TOKENS.ink }}
                    >
                      <PiggyBank size={16} className="me-2" /> Margen de
                      Ganancia Estimado
                    </h6>
                    <p className="text-muted small mb-2">
                      Compara el costo total de producción configurado contra el
                      precio predicho por el modelo.
                    </p>
                    <MarginDonut
                      costo={costoTotal}
                      precio={data.precio_predicho_COP_kg}
                      color={modeloActivo.color}
                    />
                  </Card>
                </Col>
              )}
            </Row>

            {/* Alertas e Interpretación Comercial */}
            <div className="mt-4">
              {data.precio_predicho_COP_kg > precioPromedio ? (
                <Alert
                  variant="success"
                  className="border-0 shadow-sm d-flex align-items-center rounded-3 p-3"
                  style={{ background: TOKENS.primarySoft }}
                >
                  <span className="fs-3 me-3">📈</span>
                  <div style={{ fontSize: "13.5px", color: TOKENS.ink }}>
                    <strong>Tendencia de Mercado Al Alza:</strong> Se Proyecta
                    un incremento del precio respecto al último cierre simulado
                    (${precioPromedio.toLocaleString("es-CO")}). Escenario
                    óptimo para planificar ventas estratégicas o cosechas
                    inmediatas.
                  </div>
                </Alert>
              ) : (
                <Alert
                  variant="warning"
                  className="border-0 shadow-sm d-flex align-items-center rounded-3 p-3"
                  style={{ background: "#FFF9E6" }}
                >
                  <span className="fs-3 me-3">📉</span>
                  <div style={{ fontSize: "13.5px", color: TOKENS.ink }}>
                    <strong>
                      Tendencia de Mercado a la Baja o Estabilidad:
                    </strong>{" "}
                    Se proyecta un decrecimiento o corrección de precio. Esto
                    puede deberse a choques en las variables de entorno
                    configuradas. Evalúe estrategias de acopio o contención de
                    costos.
                  </div>
                </Alert>
              )}
            </div>

            {/* Resumen Técnico */}
            <Card className="border-0 shadow-sm bg-white p-3 rounded-3 mt-3">
              <Card.Body className="p-2">
                <h6 className="fw-bold" style={{ color: TOKENS.ink }}>
                  <span className="me-1">📝</span> Resumen Técnico del Escenario
                </h6>
                <p
                  className="text-muted small mb-0 lh-lg"
                  style={{ textAlign: "justify" }}
                >
                  Al evaluar el comportamiento de la variedad{" "}
                  <strong>{getNombreProducto()}</strong> en un horizonte de
                  proyección de <strong>{horizonte} día(s)</strong>
                  {usaTemperatura
                    ? `, habiendo condicionado el simulador a una temperatura de ${tmediaC}°C`
                    : ""}
                  {usaLluvia ? ` y una precipitación de ${prec30Mm}mm` : ""}
                  {usaAbastecimientoCosto
                    ? `, con un volumen de abastecimiento en plaza de ${cantTonTotal} toneladas e insumos tasados sobre $${costoTotal.toLocaleString("es-CO")}/kg`
                    : ""}
                  , el motor de inteligencia artificial LSTM establece que el
                  precio por kilogramo oscilará con un 95% de certeza entre un
                  mínimo de{" "}
                  <strong>
                    ${data.IC_inferior_95?.toLocaleString("es-CO")}
                  </strong>{" "}
                  y un máximo esperado de{" "}
                  <strong>
                    ${data.IC_superior_95?.toLocaleString("es-CO")}
                  </strong>
                  .
                </p>
              </Card.Body>
            </Card>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default PredictionPanel;
