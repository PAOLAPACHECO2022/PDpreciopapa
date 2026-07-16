import React, { useState, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import {
  Sprout,
  Thermometer,
  CloudRain,
  Warehouse,
  Coins,
  Play,
  Loader2,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  ScanLine,
  Gauge,
  Compass,
} from "lucide-react";

// Importación de tu instancia personalizada de Axios con interceptores de Token
import API from "../axios/axiosConfig";

// ─────────────────────────────────────────────────────────────────────────
// SISTEMA DE COLOR — Estilo "reporte Power BI" para un panel agrícola
// ─────────────────────────────────────────────────────────────────────────
const TOKENS = {
  bg: "#F2F7EC",
  surface: "#FFFFFF",
  surfaceAlt: "#F7FBF2",
  ink: "#1E2B18",
  inkMuted: "#66735A",
  hairline: "#DEE9D2",
  primary: "#4db806",
  primaryDark: "#256029",
  primarySoft: "#E4F3D9",
  risk: "#A23B2E",
  riskSoft: "#F5E1DD",
  amber: "#C08A2E",
  amberSoft: "#F6ECD6",
  ink2: "#3A4A32",
};

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');";

// ─────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN OFICIAL DE MODELOS Y LÍNEAS BASE (v7.10)
// ─────────────────────────────────────────────────────────────────────────
const MODELOS = {
  papa_negra: {
    label: "Papa Negra",
    cobertura: "Nacional",
    color: TOKENS.primaryDark,
    arquitectura: "LSTM-E · secuencia directa",
    ventana: "60 días",
    escalador: "MinMaxScaler",
    estacionariedad: "Niveles (ADF p = 0.034)",
    variables: {
      1: ["precio_promedio", "prec30_mm"],
      7: ["precio_promedio", "tmedia_c", "prec30_mm"],
    },
    importancia: {
      1: [
        ["Precio (lag)", 0.71],
        ["Precipitación 30d", 0.29],
      ],
      7: [
        ["Precio (lag)", 0.52],
        ["Precipitación 30d", 0.31],
        ["Temp. media", 0.17],
      ],
    },
  },
  papa_amarilla_BOGOTA: {
    label: "Papa Amarilla — Bogotá",
    cobertura: "Bogotá",
    color: TOKENS.primary,
    arquitectura: "LSTM-E · secuencia agregada",
    ventana: "60 días",
    escalador: "StandardScaler",
    estacionariedad: "Log-retornos (ADF p = 0.10)",
    variables: {
      1: ["precio_promedio", "Cant_Ton_Total", "costo_total", "tmedia_c"],
      7: ["precio_promedio", "Cant_Ton_Total", "costo_total", "tmedia_c"],
    },
    importancia: {
      1: [
        ["Precio (lag)", 0.44],
        ["Abastecimiento", 0.31],
        ["Costo total", 0.18],
        ["Temp. media", 0.07],
      ],
      7: [
        ["Abastecimiento", 0.38],
        ["Precio (lag)", 0.33],
        ["Costo total", 0.2],
        ["Temp. media", 0.09],
      ],
    },
  },
  papa_amarilla_TUNJA: {
    label: "Papa Amarilla — Tunja",
    cobertura: "Tunja",
    color: TOKENS.amber,
    arquitectura: "LSTM-E · secuencia agregada",
    ventana: "30 días",
    escalador: "StandardScaler",
    estacionariedad: "Log-retornos (ADF p = 0.10)",
    variables: {
      1: ["precio_promedio", "Cant_Ton_Total", "costo_total", "tmedia_c"],
      7: ["precio_promedio", "Cant_Ton_Total", "costo_total", "tmedia_c"],
    },
    importancia: {
      1: [
        ["Abastecimiento", 0.4],
        ["Precio (lag)", 0.3],
        ["Costo total", 0.21],
        ["Temp. media", 0.09],
      ],
      7: [
        ["Abastecimiento", 0.36],
        ["Costo total", 0.28],
        ["Precio (lag)", 0.24],
        ["Temp. media", 0.12],
      ],
    },
  },
};

const VAR_LABEL = {
  precio_promedio: "Precio (lag)",
  Cant_Ton_Total: "Abastecimiento",
  costo_total: "Costo total",
  tmedia_c: "Temp. media",
  prec30_mm: "Precip. 30d",
};

const BASELINE = {
  precio: 2500,
  temp: 16,
  abastecimiento: 450,
  costo: 1800,
  lluvia: 120,
};

const RANGOS = {
  precio: [500, 6000],
  temp: [5, 32],
  abastecimiento: [50, 1000],
  costo: [500, 4000],
  lluvia: [0, 400],
};

const normalizar = (valor, [min, max]) =>
  Math.round((Math.min(Math.max(valor, min), max) - min) * (100 / (max - min)));

const fmtCOP = (v) => `$${Math.round(v).toLocaleString("es-CO")}`;
// ─────────────────────────────────────────────────────────────────────────
// COMPONENTES DE INTERFAZ ATÓMICOS
// ─────────────────────────────────────────────────────────────────────────

function SliderField({
  icon: Icon,
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  accent,
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
            fontWeight: 600,
            color: TOKENS.inkMuted,
            fontFamily: "Inter",
          }}
        >
          <Icon size={14} strokeWidth={2} style={{ color: accent }} />
          {label}
        </span>
        <span
          style={{
            fontFamily: "IBM Plex Mono",
            fontSize: 13,
            fontWeight: 600,
            color: TOKENS.ink,
          }}
        >
          {typeof value === "number" && value > 1000
            ? fmtCOP(value)
            : `${value}${unit || ""}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="af-range"
        style={{ "--track-color": accent }}
      />
    </div>
  );
}

function KpiCard({ label, value, sub, tone, Icon }) {
  const tones = {
    primary: {
      bg: TOKENS.primarySoft,
      fg: TOKENS.primary,
      bar: TOKENS.primary,
    },
    risk: { bg: TOKENS.riskSoft, fg: TOKENS.risk, bar: TOKENS.risk },
    forest: {
      bg: TOKENS.primarySoft,
      fg: TOKENS.primaryDark,
      bar: TOKENS.primaryDark,
    },
  };
  const t = tones[tone] || tones.primary;
  return (
    <div
      style={{
        background: TOKENS.surface,
        border: `1px solid ${TOKENS.hairline}`,
        borderTop: `4px solid ${t.bar}`,
        borderRadius: 10,
        padding: "16px 18px",
        flex: 1,
        minWidth: 150,
        boxShadow: "0 1px 2px rgba(30,43,24,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: t.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={14} style={{ color: t.fg }} />
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: TOKENS.inkMuted,
            fontFamily: "Inter",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: "IBM Plex Mono",
          fontSize: 24,
          fontWeight: 600,
          color: TOKENS.ink,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 12,
            color: TOKENS.inkMuted,
            marginTop: 6,
            fontFamily: "Inter",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function RangeGauge({ floor, mid, ceil, current, color }) {
  const span = Math.max(ceil - floor, 1);
  const pct = (v) => Math.min(100, Math.max(0, ((v - floor) / span) * 100));
  return (
    <div style={{ marginTop: 4 }}>
      <div
        style={{
          position: "relative",
          height: 10,
          borderRadius: 999,
          background: "#EAF1E1",
          overflow: "visible",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct(mid)}%`,
            background: color,
            borderRadius: 999,
            opacity: 0.35,
          }}
        />
        <div
          title="Precio simulado actual"
          style={{
            position: "absolute",
            left: `${pct(current)}%`,
            top: -4,
            width: 2,
            height: 18,
            background: TOKENS.ink,
            transform: "translateX(-1px)",
          }}
        />
        <div
          title="Predicción central"
          style={{
            position: "absolute",
            left: `${pct(mid)}%`,
            top: -6,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: TOKENS.surface,
            border: `3px solid ${color}`,
            transform: "translateX(-7px)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          fontFamily: "IBM Plex Mono",
          fontSize: 11.5,
          color: TOKENS.inkMuted,
        }}
      >
        <span>{fmtCOP(floor)}</span>
        <span style={{ color: TOKENS.ink, fontWeight: 600 }}>
          hoy: {fmtCOP(current)}
        </span>
        <span>{fmtCOP(ceil)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// GRÁFICA: BRÚJULA DEL ESCENARIO (Tela de Araña / Radar)
// ─────────────────────────────────────────────────────────────────────────
function ScenarioRadar({ ejes, color }) {
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
          name="Condición típica"
          dataKey="base"
          stroke={TOKENS.inkMuted}
          fill={TOKENS.inkMuted}
          fillOpacity={0.06}
          strokeDasharray="4 4"
          strokeWidth={1.5}
        />
        <Radar
          name="Tu escenario"
          dataKey="valor"
          stroke={color}
          fill={color}
          fillOpacity={0.28}
          strokeWidth={2.5}
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
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────
export default function ProductDashboard() {
  // Parámetros principales del modelo
  const [producto, setProducto] = useState("papa_negra");
  const [horizonte, setHorizonte] = useState(7);

  // Variables exógenas manipulables por el agricultor
  const [precioPromedio, setPrecioPromedio] = useState(2500);
  const [cantTonTotal, setCantTonTotal] = useState(450);
  const [costoTotal, setCostoTotal] = useState(1800);
  const [tmediaC, setTmediaC] = useState(16);
  const [prec30Mm, setPrec30Mm] = useState(120);

  // Estados de control de UI
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const modelo = MODELOS[producto];
  const esAmarilla = producto.includes("papa_amarilla");
  const mostrarLluvia = producto === "papa_negra" && horizonte === 7;
  const featuresActivas = modelo.variables[horizonte];
  const importancia = modelo.importancia[horizonte];

  // Conexión real con el servidor de producción /api/agro-predictions
  const consultarPrediccion = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        producto,
        horizonte,
        precio_promedio: precioPromedio,
        tmedia_c: tmediaC,
      };
      if (esAmarilla) {
        payload.Cant_Ton_Total = cantTonTotal;
        payload.costo_total = costoTotal;
      }
      if (mostrarLluvia) {
        payload.prec30_mm = prec30Mm;
      }

      const res = await API.get("/api/agro-predictions", { params: payload });
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError(
        "No se pudo obtener la predicción. Por favor, verifica que el servicio Node y el motor LSTM se encuentren activos.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    producto,
    horizonte,
    precioPromedio,
    tmediaC,
    cantTonTotal,
    costoTotal,
    prec30Mm,
    esAmarilla,
    mostrarLluvia,
  ]);

  // Generación matemática de la trayectoria temporal del canal (Hoy -> Meta)
  const chartData = useMemo(() => {
    if (!data) return [];
    const pred = data.precio_predicho_COP_kg || precioPromedio;
    const inf = data.IC_inferior_95 || pred;
    const sup = data.IC_superior_95 || pred;

    const pts = [
      {
        name: "Hoy",
        precio: precioPromedio,
        banda: [
          precioPromedio - Math.abs(sup - inf) * 0.06,
          precioPromedio + Math.abs(sup - inf) * 0.06,
        ],
      },
    ];
    if (horizonte === 7) {
      const midPrecio = Math.round((precioPromedio + pred) / 2);
      const midInf = Math.round(
        (precioPromedio + inf) / 2 - Math.abs(sup - inf) * 0.08,
      );
      const midSup = Math.round(
        (precioPromedio + sup) / 2 + Math.abs(sup - inf) * 0.08,
      );
      pts.push({ name: "Día 4", precio: midPrecio, banda: [midInf, midSup] });
    }
    pts.push({
      name: `Meta · ${data.fecha_prediccion || ""}`,
      precio: pred,
      banda: [inf, sup],
    });
    return pts;
  }, [data, precioPromedio, horizonte]);

  // Construcción dinámica de la normalización de ejes para la tela de araña (Radar)
  const radarEjes = useMemo(() => {
    const ejes = [
      {
        eje: "Precio",
        valor: normalizar(precioPromedio, RANGOS.precio),
        base: normalizar(BASELINE.precio, RANGOS.precio),
      },
      {
        eje: "Temperatura",
        valor: normalizar(tmediaC, RANGOS.temp),
        base: normalizar(BASELINE.temp, RANGOS.temp),
      },
    ];
    if (esAmarilla) {
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
    if (mostrarLluvia) {
      ejes.push({
        eje: "Lluvia",
        valor: normalizar(prec30Mm, RANGOS.lluvia),
        base: normalizar(BASELINE.lluvia, RANGOS.lluvia),
      });
    }
    return ejes;
  }, [
    precioPromedio,
    tmediaC,
    cantTonTotal,
    costoTotal,
    prec30Mm,
    esAmarilla,
    mostrarLluvia,
  ]);

  const delta = data ? (data.precio_predicho_COP_kg || 0) - precioPromedio : 0;
  const deltaPct = data ? (delta / precioPromedio) * 100 : 0;
  const subiendo = delta >= 0;
  return (
    <div
      style={{
        background: TOKENS.bg,
        minHeight: "100vh",
        padding: "28px 20px",
        fontFamily: "Inter",
      }}
    >
      <style>{`
        ${FONT_IMPORT}
        .af-range { -webkit-appearance:none; appearance:none; width:100%; height:4px; border-radius:999px; background:${TOKENS.hairline}; outline:none; }
        .af-range::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:${TOKENS.surface}; border:3px solid var(--track-color); cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.25); margin-top:0; }
        .af-range::-moz-range-thumb { width:16px; height:16px; border-radius:50%; background:${TOKENS.surface}; border:3px solid var(--track-color); cursor:pointer; }
        .af-chip { font-family:'IBM Plex Mono'; font-size:11px; padding:4px 9px; border-radius:5px; background:${TOKENS.surfaceAlt}; border:1px solid ${TOKENS.hairline}; color:${TOKENS.ink2}; white-space:nowrap; }
        .af-btn:hover:not(:disabled) { filter:brightness(1.05); }
        .af-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .af-pill { transition: background .15s ease; }
        .af-pill:hover { background:${TOKENS.surfaceAlt} !important; }
      `}</style>

      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div
          style={{
            height: 4,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${TOKENS.primary}, ${TOKENS.primaryDark})`,
            marginBottom: 16,
          }}
        />

        {/* Encabezado */}
        <div
          style={{
            background: TOKENS.surface,
            border: `1px solid ${TOKENS.hairline}`,
            borderRadius: 12,
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            boxShadow: "0 1px 2px rgba(30,43,24,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 9,
                background: TOKENS.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sprout size={20} color="#fff" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "Sora",
                  fontSize: 19,
                  fontWeight: 700,
                  color: TOKENS.ink,
                  letterSpacing: "-0.01em",
                }}
              >
                AgriForecast
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: TOKENS.inkMuted,
                  fontFamily: "Inter",
                }}
              >
                Motor predictivo LSTM-E v7.10 · Simulador de escenarios
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: TOKENS.primarySoft,
              padding: "6px 12px",
              borderRadius: 999,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: TOKENS.primary,
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: TOKENS.primaryDark,
                fontFamily: "IBM Plex Mono",
                fontWeight: 600,
              }}
            >
              3 modelos en servicio
            </span>
          </div>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 18 }}
        >
          {/* SECCIÓN IZQUIERDA: CONTROLES */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                background: TOKENS.surface,
                border: `1px solid ${TOKENS.hairline}`,
                borderRadius: 10,
                padding: 18,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: TOKENS.inkMuted,
                  marginBottom: 12,
                }}
              >
                Producto y horizonte
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  marginBottom: 14,
                }}
              >
                {Object.entries(MODELOS).map(([key, m]) => (
                  <button
                    key={key}
                    className="af-pill"
                    onClick={() => setProducto(key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      textAlign: "left",
                      padding: "9px 10px",
                      borderRadius: 7,
                      border: `1px solid ${producto === key ? m.color : TOKENS.hairline}`,
                      background:
                        producto === key ? TOKENS.surfaceAlt : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: m.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: producto === key ? 600 : 500,
                        color: TOKENS.ink,
                        fontFamily: "Inter",
                      }}
                    >
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 7].map((h) => (
                  <button
                    key={h}
                    onClick={() => setHorizonte(h)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 7,
                      cursor: "pointer",
                      fontFamily: "IBM Plex Mono",
                      fontSize: 12.5,
                      fontWeight: 600,
                      border: `1px solid ${horizonte === h ? TOKENS.primary : TOKENS.hairline}`,
                      background:
                        horizonte === h ? TOKENS.primary : "transparent",
                      color: horizonte === h ? "#0F1A0B" : TOKENS.inkMuted,
                    }}
                  >
                    {h === 1 ? "1 día" : "7 días"}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                background: TOKENS.surface,
                border: `1px solid ${TOKENS.hairline}`,
                borderRadius: 10,
                padding: 18,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: TOKENS.inkMuted,
                  marginBottom: 14,
                }}
              >
                Variables del escenario
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <SliderField
                  icon={Coins}
                  label="Precio último cierre"
                  value={precioPromedio}
                  onChange={setPrecioPromedio}
                  min={500}
                  max={6000}
                  step={50}
                  accent={TOKENS.primary}
                />
                <SliderField
                  icon={Thermometer}
                  label="Temperatura media"
                  value={tmediaC}
                  onChange={setTmediaC}
                  min={5}
                  max={32}
                  step={1}
                  unit="°C"
                  accent={TOKENS.risk}
                />
                {esAmarilla && (
                  <>
                    <SliderField
                      icon={Warehouse}
                      label="Abastecimiento en plaza"
                      value={cantTonTotal}
                      onChange={setCantTonTotal}
                      min={50}
                      max={1000}
                      step={10}
                      unit=" ton"
                      accent={TOKENS.amber}
                    />
                    <SliderField
                      icon={Coins}
                      label="Costo total de producción"
                      value={costoTotal}
                      onChange={setCostoTotal}
                      min={500}
                      max={4000}
                      step={50}
                      accent={TOKENS.primaryDark}
                    />
                  </>
                )}
                {mostrarLluvia && (
                  <SliderField
                    icon={CloudRain}
                    label="Precipitación acumulada 30d"
                    value={prec30Mm}
                    onChange={setPrec30Mm}
                    min={0}
                    max={400}
                    step={5}
                    unit=" mm"
                    accent="#3E7CB1"
                  />
                )}
              </div>
              <button
                className="af-btn"
                onClick={consultarPrediccion}
                disabled={loading}
                style={{
                  width: "100%",
                  marginTop: 18,
                  padding: "11px 0",
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  background: TOKENS.primary,
                  color: "#0F1A0B",
                  fontFamily: "Inter",
                  fontWeight: 700,
                  fontSize: 13.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 10px rgba(77,184,6,0.25)",
                }}
              >
                {loading ? (
                  <Loader2
                    size={15}
                    style={{ animation: "spin 0.8s linear infinite" }}
                  />
                ) : (
                  <Play size={14} />
                )}
                {loading ? "Ejecutando modelo…" : "Simular precio"}
              </button>
            </div>

            <div
              style={{
                background: TOKENS.surface,
                border: `1px solid ${TOKENS.hairline}`,
                borderRadius: 10,
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: TOKENS.inkMuted,
                  marginBottom: 12,
                }}
              >
                <Layers size={13} /> Ficha técnica del modelo
              </div>
              {[
                ["Cobertura", modelo.cobertura],
                ["Arquitectura", modelo.arquitectura],
                ["Ventana temporal", modelo.ventana],
                ["Escalador", modelo.escalador],
                ["Estacionariedad", modelo.estacionariedad],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: `1px solid ${TOKENS.hairline}`,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: TOKENS.inkMuted }}>{k}</span>
                  <span
                    style={{
                      color: TOKENS.ink,
                      fontWeight: 600,
                      fontFamily: "IBM Plex Mono",
                      fontSize: 11.5,
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 10 }}>
                <div
                  style={{
                    fontSize: 11.5,
                    color: TOKENS.inkMuted,
                    marginBottom: 6,
                  }}
                >
                  Variables activas (h={horizonte})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {featuresActivas.map((f) => (
                    <span key={f} className="af-chip">
                      {VAR_LABEL[f]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* SECCIÓN RECTANGULAR PRINCIPAL: MONITORES */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && (
              <div
                style={{
                  background: TOKENS.riskSoft,
                  border: `1px solid ${TOKENS.risk}33`,
                  color: TOKENS.risk,
                  borderRadius: 8,
                  padding: "12px 16px",
                  fontSize: 13,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <Info size={16} /> {error}
              </div>
            )}

            {!data && !loading && !error && (
              <div
                style={{
                  background: TOKENS.surface,
                  border: `1px dashed ${TOKENS.hairline}`,
                  borderRadius: 10,
                  padding: "56px 24px",
                  textAlign: "center",
                }}
              >
                <ScanLine
                  size={26}
                  style={{ color: TOKENS.inkMuted, marginBottom: 10 }}
                />
                <div
                  style={{
                    fontFamily: "Sora",
                    fontSize: 16,
                    fontWeight: 700,
                    color: TOKENS.ink,
                    marginBottom: 4,
                  }}
                >
                  Sin escenario simulado
                </div>
                <div style={{ fontSize: 13, color: TOKENS.inkMuted }}>
                  Ajusta las variables a la izquierda y presiona "Simular
                  precio".
                </div>
              </div>
            )}

            {loading && (
              <div style={{ display: "flex", gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 92,
                      borderRadius: 8,
                      background:
                        "linear-gradient(90deg, #E9F1DF 25%, #F2F7EC 37%, #E9F1DF 63%)",
                      backgroundSize: "400% 100%",
                      animation: "shimmer 1.4s ease infinite",
                    }}
                  />
                ))}
              </div>
            )}

            {data && !loading && (
              <>
                <div style={{ display: "flex", gap: 12 }}>
                  <KpiCard
                    label="Precio simulado"
                    value={fmtCOP(data.precio_predicho_COP_kg)}
                    sub={`para ${data.fecha_prediccion}`}
                    tone="primary"
                    Icon={Gauge}
                  />
                  <KpiCard
                    label="Piso (IC 95%)"
                    value={fmtCOP(data.IC_inferior_95)}
                    sub="riesgo mínimo"
                    tone="risk"
                    Icon={TrendingDown}
                  />
                  <KpiCard
                    label="Techo (IC 95%)"
                    value={fmtCOP(data.IC_superior_95)}
                    sub="techo optimista"
                    tone="forest"
                    Icon={TrendingUp}
                  />
                </div>

                <div
                  style={{
                    background: TOKENS.surface,
                    border: `1px solid ${TOKENS.hairline}`,
                    borderRadius: 10,
                    padding: "18px 20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: TOKENS.inkMuted,
                      }}
                    >
                      Posición dentro del intervalo de confianza
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: subiendo ? TOKENS.primaryDark : TOKENS.risk,
                        fontFamily: "IBM Plex Mono",
                      }}
                    >
                      {subiendo ? (
                        <TrendingUp size={13} />
                      ) : (
                        <TrendingDown size={13} />
                      )}
                      {subiendo ? "+" : ""}
                      {deltaPct.toFixed(1)}% vs. último cierre
                    </span>
                  </div>
                  <RangeGauge
                    floor={data.IC_inferior_95}
                    mid={data.precio_predicho_COP_kg}
                    ceil={data.IC_superior_95}
                    current={precioPromedio}
                    color={modelo.color}
                  />
                </div>

                <div
                  style={{
                    background: TOKENS.surface,
                    border: `1px solid ${TOKENS.hairline}`,
                    borderRadius: 10,
                    padding: "18px 20px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: TOKENS.inkMuted,
                      marginBottom: 12,
                    }}
                  >
                    Trayectoria de precio · {modelo.label}
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart
                      data={chartData}
                      margin={{ top: 6, right: 16, left: 4, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="bandFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={TOKENS.primary}
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="100%"
                            stopColor={TOKENS.primary}
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke={TOKENS.hairline}
                      />
                      <XAxis
                        dataKey="name"
                        stroke={TOKENS.inkMuted}
                        tickLine={false}
                        axisLine={{ stroke: TOKENS.hairline }}
                        style={{ fontSize: 11.5, fontFamily: "Inter" }}
                      />
                      <YAxis
                        stroke={TOKENS.inkMuted}
                        tickLine={false}
                        axisLine={false}
                        width={72}
                        style={{ fontSize: 11, fontFamily: "IBM Plex Mono" }}
                        tickFormatter={(v) => fmtCOP(v)}
                        domain={["dataMin - 150", "dataMax + 150"]}
                      />
                      <Tooltip
                        contentStyle={{
                          background: TOKENS.surface,
                          border: `1px solid ${TOKENS.hairline}`,
                          borderRadius: 8,
                          fontSize: 12.5,
                          fontFamily: "Inter",
                        }}
                        formatter={(v, name) =>
                          name === "banda"
                            ? [null, null]
                            : [fmtCOP(v), "Precio simulado"]
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="banda"
                        stroke="none"
                        fill="url(#bandFill)"
                      />
                      <Line
                        type="monotone"
                        dataKey="precio"
                        stroke={TOKENS.primary}
                        strokeWidth={3}
                        dot={{
                          r: 4,
                          fill: TOKENS.surface,
                          stroke: TOKENS.primary,
                          strokeWidth: 2.5,
                        }}
                        activeDot={{ r: 6 }}
                      />
                      <ReferenceDot
                        x="Hoy"
                        y={precioPromedio}
                        r={5}
                        fill={TOKENS.ink}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* 🕸️ AQUÍ ESTÁ INTEGRADA LA GRÁFICA DE TELA DE ARAÑA (BRÚJULA DEL ESCENARIO) */}
                <div
                  style={{
                    background: TOKENS.surface,
                    border: `1px solid ${TOKENS.hairline}`,
                    borderRadius: 10,
                    padding: "18px 20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: TOKENS.inkMuted,
                      marginBottom: 4,
                    }}
                  >
                    <Compass size={13} /> Brújula del escenario
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: TOKENS.inkMuted,
                      marginBottom: 6,
                    }}
                  >
                    Compara tu simulación (verde) contra una condición típica de
                    referencia (gris punteado). Mientras más se "infle" el verde
                    hacia un eje, más se aleja ese factor de lo normal.
                  </div>
                  <ScenarioRadar ejes={radarEjes} color={TOKENS.primary} />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      background: TOKENS.surface,
                      border: `1px solid ${TOKENS.hairline}`,
                      borderRadius: 10,
                      padding: "16px 20px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: TOKENS.inkMuted,
                        marginBottom: 12,
                      }}
                    >
                      Importancia relativa (referencial)
                    </div>
                    {importancia.map(([label, val]) => (
                      <div key={label} style={{ marginBottom: 9 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                            marginBottom: 3,
                          }}
                        >
                          <span style={{ color: TOKENS.ink }}>{label}</span>
                          <span
                            style={{
                              fontFamily: "IBM Plex Mono",
                              color: TOKENS.inkMuted,
                            }}
                          >
                            {Math.round(val * 100)}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            borderRadius: 999,
                            background: "#EAF1E1",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${val * 100}%`,
                              borderRadius: 999,
                              background: TOKENS.primary,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <div
                      style={{
                        fontSize: 10.5,
                        color: TOKENS.inkMuted,
                        marginTop: 6,
                      }}
                    >
                      Basado en el análisis PFI (h=1) reportado por el pipeline
                      de entrenamiento; no se recalcula en cada consulta.
                    </div>
                  </div>

                  <div
                    style={{
                      background: TOKENS.surface,
                      border: `1px solid ${TOKENS.hairline}`,
                      borderRadius: 10,
                      padding: "16px 20px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: TOKENS.inkMuted,
                        marginBottom: 10,
                      }}
                    >
                      Lectura del escenario
                    </div>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: TOKENS.ink,
                        lineHeight: 1.6,
                        margin: 0,
                      }}
                    >
                      Para <strong>{modelo.label}</strong> a{" "}
                      <strong>
                        {horizonte} día{horizonte > 1 ? "s" : ""}
                      </strong>
                      , con temperatura de <strong>{tmediaC}°C</strong>
                      {mostrarLluvia ? (
                        <>
                          {" "}
                          y precipitación de <strong>{prec30Mm} mm</strong>
                        </>
                      ) : null}
                      {esAmarilla ? (
                        <>
                          , abastecimiento de{" "}
                          <strong>{cantTonTotal} ton</strong> y costos de{" "}
                          <strong>{fmtCOP(costoTotal)}</strong>
                        </>
                      ) : null}
                      , el modelo ubica el precio entre{" "}
                      <strong>{fmtCOP(data.IC_inferior_95)}</strong> y{" "}
                      <strong>{fmtCOP(data.IC_superior_95)}</strong> con un 95%
                      de cobertura.
                    </p>
                    <p
                      style={{
                        fontSize: 10.5,
                        color: TOKENS.inkMuted,
                        marginTop: 10,
                        marginBottom: 0,
                      }}
                    >
                      El intervalo proviene de un bootstrap de estabilidad (50
                      réplicas con ruido gaussiano), no de un test estadístico
                      formal sobre el error histórico.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

  ----------------------------SEGUNDO CODIGO----------------------------


import React, { useState } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Button,
  Spinner,
  Alert,
  Accordion,
} from "react-bootstrap";

// Importación de componentes de Recharts para recrear la experiencia Power BI
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
} from "recharts";

// Importación de tu instancia personalizada de Axios con interceptores de Token
import API from "../axios/axiosConfig";

const PredictionPanel = () => {
  // Parámetros principales del Modelo
  const [producto, setProducto] = useState("papa_negra");
  const [horizonte, setHorizonte] = useState(7);

  // --- VARIABLES EXÓGENAS MANIPULABLES POR EL AGRICULTOR ---
  const [precioPromedio, setPrecioPromedio] = useState(2500); // COP/kg base
  const [cantTonTotal, setCantTonTotal] = useState(450); // Toneladas en plaza
  const [costoTotal, setCostoTotal] = useState(1800); // Costo de producción base
  const [tmediaC, setTmediaC] = useState(16); // Temperatura media °C
  const [prec30Mm, setPrec30Mm] = useState(120); // Precipitación acumulada mm

  // Estados de control de UI
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]); // Estado para guardar los puntos de la gráfica

  const consultarPrediccion = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setChartData([]);

    const paramsPayload = {
      producto: producto,
      horizonte: horizonte,
      precio_promedio: precioPromedio,
      tmedia_c: tmediaC,
    };

    if (producto.includes("papa_amarilla")) {
      paramsPayload.Cant_Ton_Total = cantTonTotal;
      paramsPayload.costo_total = costoTotal;
    } else if (producto === "papa_negra" && horizonte === 7) {
      paramsPayload.prec30_mm = prec30Mm;
    }

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

      // 📊 GENERADOR DE CANAL DE INCERTIDUMBRE (Estilo Power BI Analytics)
      const dataPuntos = [
        {
          name: "Hoy (Cierre)",
          "Precio Simulado": precioPromedio,
          // En el día 0, el margen es estrecho porque es el precio real conocido de la plaza
          "Banda Rango": [precioPromedio - 20, precioPromedio + 20],
          "Riesgo Mínimo": precioPromedio,
          "Techo Optimista": precioPromedio,
        },
      ];

      if (horizonte === 7) {
        // Punto intermedio (Día 4 aproximado): Abrimos el canal a la mitad del camino real
        const simIntermedio = Math.round((precioPromedio + pPredicho) / 2);
        const infIntermedio = Math.round((precioPromedio + icInf) / 2) - 40; // Ajuste dinámico de dispersión
        const supIntermedio = Math.round((precioPromedio + icSup) / 2) + 40;

        dataPuntos.push({
          name: "Tendencia Media",
          "Precio Simulado": simIntermedio,
          "Banda Rango": [infIntermedio, supIntermedio],
          "Riesgo Mínimo": infIntermedio,
          "Techo Optimista": supIntermedio,
        });
      }

      // Punto final (Meta)
      dataPuntos.push({
        name: `Meta: ${fechaMeta}`,
        "Precio Simulado": pPredicho,
        "Banda Rango": [icInf, icSup], // Mapeo numérico para el componente Area de Recharts
        "Riesgo Mínimo": icInf,
        "Techo Optimista": icSup,
      });

      setChartData(dataPuntos);
    } catch (err) {
      console.error("Error al consultar el servicio:", err);
      setError(
        "No se pudo obtener la predicción. Por favor, verifica los servidores.",
      );
    } finally {
      setLoading(false);
    }
  };

  // 🎨 Estilos visuales AgriForecast actualizados para reportes limpios
  const brandStyles = {
    title: { color: "#5e4b3c", fontWeight: "800", fontSize: "1.25rem" },
    label: { color: "#5e4b3c", fontWeight: "600", fontSize: "0.85rem" },
    exoLabel: { color: "#4a3e3d", fontWeight: "500", fontSize: "0.82rem" },
    selectStyle: {
      border: "1px solid rgba(94, 75, 60, 0.2)",
      padding: "10px 12px",
    },
    calcButton: {
      background: "#4db806",
      border: "none",
      color: "#212529",
      padding: "11px 20px",
      fontWeight: "bold",
      boxShadow: "0 4px 10px rgba(77, 184, 6, 0.25)",
    },
    badgeDate: { background: "#5e4b3c", color: "#fff" },
    metricPrice: { color: "#4db806" },
    metricHigh: { color: "#2e7d32" },
    metricLow: { color: "#c62828" },
  };

  const getNombreProducto = () => {
    if (producto === "papa_negra") return "Papa Negra";
    if (producto === "papa_amarilla_BOGOTA") return "Papa Amarilla (Bogotá)";
    return "Papa Amarilla (Tunja)";
  };
  return (
    <Card
      className="shadow-sm border-0 mb-4 rounded-4"
      style={{ backgroundColor: "#f8f6f2" }}
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

        {/* Formulario Principal */}
        <Form className="mb-4">
          <Row className="g-3 align-items-end">
            <Col xs={12} md={5}>
              <Form.Group>
                <Form.Label style={brandStyles.label}>
                  Variedad de Papa a Evaluar
                </Form.Label>
                <Form.Select
                  value={producto}
                  onChange={(e) => setProducto(e.target.value)}
                  style={brandStyles.selectStyle}
                  className="rounded-3 shadow-sm"
                >
                  <option value="papa_negra">Papa Negra (Estratificada)</option>
                  <option value="papa_amarilla_BOGOTA">
                    Papa Amarilla — Bogotá
                  </option>
                  <option value="papa_amarilla_TUNJA">
                    Papa Amarilla — Tunja
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
                  <option value={1}>1 Día (Corto Plazo)</option>
                  <option value={7}>7 Días (Tendencia Semanal)</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} sm={6} md={3}>
              <Button
                style={brandStyles.calcButton}
                className="w-100 fw-bold rounded-3 shadow-sm"
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

          {/* Acordeón Exógeno Adaptativo */}
          <Accordion className="mt-4 border-0 shadow-sm rounded-3 overflow-hidden">
            <Accordion.Item eventKey="0" className="border-0">
              <Accordion.Header style={{ backgroundColor: "#eae6df" }}>
                🌱{" "}
                <strong>
                  Configurar Variables del Entorno / Simular Escenario
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

                  <Col xs={12} sm={6} md={4}>
                    <Form.Group>
                      <Form.Label style={brandStyles.exoLabel}>
                        Temperatura Media Climatológica:{" "}
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

                  {producto.includes("papa_amarilla") && (
                    <>
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
                    </>
                  )}

                  {producto === "papa_negra" && horizonte === 7 && (
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
          <Alert variant="danger" className="rounded-3">
            {error}
          </Alert>
        )}

        {/* Módulo de Resultados */}
        {data && (
          <>
            <Row className="g-3 mt-2">
              <Col xs={12} md={4}>
                <Card
                  className="border-0 shadow-sm text-center bg-white p-3 rounded-3 h-100 border-top border-4"
                  style={{ borderColor: "#4db806" }}
                >
                  <span className="small text-muted fw-bold">
                    PRECIO PREDICHO SIMULADO
                  </span>
                  <h3
                    className="fw-bold mt-2 mb-3"
                    style={brandStyles.metricPrice}
                  >
                    $
                    {data.precio_predicho_COP_kg
                      ? data.precio_predicho_COP_kg.toLocaleString("es-CO")
                      : "0"}{" "}
                    <span className="fs-6 text-muted">/kg</span>
                  </h3>
                  <div className="mt-auto">
                    <span
                      className="badge px-3 py-2 rounded-pill"
                      style={brandStyles.badgeDate}
                    >
                      📅 Meta: {data.fecha_prediccion || "N/A"}
                    </span>
                  </div>
                </Card>
              </Col>

              <Col xs={12} sm={6} md={4}>
                <Card
                  className="border-0 shadow-sm text-center bg-white p-3 rounded-3 h-100 border-top border-4"
                  style={{ borderColor: "#c62828" }}
                >
                  <span className="small text-muted fw-bold">
                    IC INFERIOR (RIESGO MÍNIMO)
                  </span>
                  <h3 className="fw-bold mt-2" style={brandStyles.metricLow}>
                    $
                    {data.IC_inferior_95
                      ? data.IC_inferior_95.toLocaleString("es-CO")
                      : "0"}{" "}
                    <span className="fs-6 text-muted">/kg</span>
                  </h3>
                  <span className="small text-muted mt-auto pt-2">
                    Límite inferior de confianza del 95%
                  </span>
                </Card>
              </Col>

              <Col xs={12} sm={6} md={4}>
                <Card
                  className="border-0 shadow-sm text-center bg-white p-3 rounded-3 h-100 border-top border-4"
                  style={{ borderColor: "#2e7d32" }}
                >
                  <span className="small text-muted fw-bold">
                    IC SUPERIOR (TECHO OPTIMISTA)
                  </span>
                  <h3 className="fw-bold mt-2" style={brandStyles.metricHigh}>
                    $
                    {data.IC_superior_95
                      ? data.IC_superior_95.toLocaleString("es-CO")
                      : "0"}{" "}
                    <span className="fs-6 text-muted">/kg</span>
                  </h3>
                  <span className="small text-muted mt-auto pt-2">
                    Límite superior de confianza del 95%
                  </span>
                </Card>
              </Col>
            </Row>

            {/* 📈 NUEVA GRÁFICA INTERACTIVA ESTILO POWER BI ── */}
            {/* 📈 GRÁFICA INTERACTIVA ESTILO POWER BI PREMIUM (ESTILIZADA) ── */}
            <Card className="border-0 shadow-sm bg-white p-4 rounded-4 mt-4">
              <div className="d-flex align-items-center mb-1">
                <span className="fs-4 me-2">📊</span>
                <h6
                  className="fw-bold mb-0"
                  style={{ color: "#5e4b3c", fontSize: "1.05rem" }}
                >
                  Canal de Seguridad Comercial — Trayectoria del Precio
                </h6>
              </div>
              <p className="text-muted small mb-4 ms-4">
                El área sombreada representa el colchón de seguridad matemática.
                Su precio debería mantenerse dentro de esta franja de
                estabilidad.
              </p>

              <div style={{ width: "100%", height: 340 }}>
                <ResponsiveContainer>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 15, right: 25, left: 15, bottom: 5 }}
                  >
                    <defs>
                      {/* Gradiente degradado premium verde-agrícola */}
                      <linearGradient
                        id="colorIncertidumbre"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#4db806"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="100%"
                          stopColor="#2e7d32"
                          stopOpacity={0.01}
                        />
                      </linearGradient>
                    </defs>

                    {/* Grilla horizontal tenue */}
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="#e2dfda"
                    />

                    <XAxis
                      dataKey="name"
                      stroke="#6d5c50"
                      tickLine={false}
                      dy={10}
                      style={{ fontSize: "11px", fontWeight: "600" }}
                    />

                    <YAxis
                      stroke="#6d5c50"
                      tickLine={false}
                      dx={-10}
                      style={{ fontSize: "11px", fontWeight: "500" }}
                      domain={["dataMin - 200", "dataMax + 200"]}
                      tickFormatter={(v) => `$${v.toLocaleString("es-CO")}`}
                    />

                    {/* Tooltip ultra-estilizado moderno */}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.96)",
                        borderRadius: "12px",
                        border: "1px solid rgba(94, 75, 60, 0.15)",
                        boxShadow: "0 8px 24px rgba(94, 75, 60, 0.12)",
                        padding: "12px 16px",
                      }}
                      itemStyle={{ fontSize: "13px", padding: "2px 0" }}
                      labelStyle={{
                        fontWeight: "bold",
                        color: "#5e4b3c",
                        marginBottom: "6px",
                        fontSize: "13px",
                      }}
                      formatter={(value, name) => {
                        if (name === "Banda Rango") return null;
                        let color = "#4db806";
                        if (name === "Techo Máximo Esperado") color = "#2e7d32";
                        if (name === "Piso Mínimo de Riesgo") color = "#c62828";

                        return [
                          <span style={{ color: color, fontWeight: "700" }}>
                            ${value.toLocaleString("es-CO")} /kg
                          </span>,
                          <span style={{ color: "#6d5c50" }}>{name}</span>,
                        ];
                      }}
                    />

                    {/* Leyenda en forma de botones circulares */}
                    <Legend
                      iconType="circle"
                      iconSize={9}
                      wrapperStyle={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#5e4b3c",
                        paddingTop: "20px",
                      }}
                    />

                    {/* Capa de Fondo: Sombra del Canal de Confianza */}
                    <Area
                      name="Zona de Estabilidad Económica"
                      type="monotone"
                      dataKey="Banda Rango"
                      stroke="transparent"
                      fill="url(#colorIncertidumbre)"
                    />

                    {/* Capa de Líneas de Control Límite */}
                    <Line
                      name="Techo Máximo Esperado"
                      type="monotone"
                      dataKey="Techo Optimista"
                      stroke="#2e7d32"
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={false}
                    />
                    <Line
                      name="Piso Mínimo de Riesgo"
                      type="monotone"
                      dataKey="Riesgo Mínimo"
                      stroke="#c62828"
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={false}
                    />

                    {/* Capa Principal: Línea de Tendencia con Botones/Nodos estilizados */}
                    <Line
                      name="Precio Sugerido Simulador"
                      type="monotone"
                      dataKey="Precio Simulado"
                      stroke="#4db806"
                      strokeWidth={4}
                      // Diseño del punto normal (Botoncito blanco con borde verde)
                      dot={{
                        r: 6,
                        fill: "#fff",
                        stroke: "#4db806",
                        strokeWidth: 3,
                        filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.15))",
                      }}
                      // Diseño del punto cuando pasas el mouse por encima
                      activeDot={{
                        r: 8,
                        fill: "#4db806",
                        stroke: "#fff",
                        strokeWidth: 3,
                        style: {
                          filter:
                            "drop-shadow(0px 4px 8px rgba(77, 184, 6, 0.5))",
                        },
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Alertas e Interpretación Comercial */}
            <div className="mt-4">
              {data.precio_predicho_COP_kg > precioPromedio ? (
                <Alert
                  variant="success"
                  className="border-0 shadow-sm d-flex align-items-center rounded-3"
                >
                  <span className="fs-3 me-3">📈</span>
                  <div>
                    <strong>Tendencia de Mercado Al Alza:</strong> Se proyecta
                    un incremento del precio respecto al último cierre simulado
                    (${precioPromedio.toLocaleString("es-CO")}). Escenario
                    óptimo para planificar ventas estratégicas o cosechas
                    inmediatas.
                  </div>
                </Alert>
              ) : (
                <Alert
                  variant="warning"
                  className="border-0 shadow-sm d-flex align-items-center rounded-3"
                >
                  <span className="fs-3 me-3">📉</span>
                  <div>
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

            <Card className="border-0 shadow-sm bg-white p-3 rounded-3 mt-3">
              <Card.Body className="p-2">
                <h6 className="fw-bold" style={{ color: "#5e4b3c" }}>
                  📝 Resumen Técnico del Escenario
                </h6>
                <p
                  className="text-muted small mb-0 lh-lg"
                  style={{ textAlign: "justify" }}
                >
                  Al evaluar el comportamiento de la variedad{" "}
                  <strong>{getNombreProducto()}</strong> en un horizonte de
                  proyección de <strong>{horizonte} día(s)</strong>, y habiendo
                  condicionado el simulador a una temperatura de{" "}
                  <strong>{tmediaC}°C</strong>{" "}
                  {producto === "papa_negra" && horizonte === 7
                    ? `y una precipitación de ${prec30Mm}mm`
                    : ""}
                  {producto.includes("papa_amarilla")
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





