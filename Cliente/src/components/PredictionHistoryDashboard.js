import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Table,
  Button,
  Spinner,
  Alert,
  Badge,
} from "react-bootstrap";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Dot,
} from "recharts";
import {
  Calendar,
  Search,
  RefreshCw,
  Filter,
  FileSpreadsheet,
  Info,
  Sparkles,
  X,
} from "lucide-react";
import API from "../axios/axiosConfig";

// Paleta de Colores de acuerdo a tu ecosistema visual
const PALETA = {
  bg: "#F4F7F2",
  surface: "#FFFFFF",
  hairline: "#E1E8DE",
  ink: "#1E2B18",
  inkMuted: "#73856C",
  primary: "#4DB806",
  primaryDark: "#347D04",
  primarySoft: "#EAF5E3",
  risk: "#DF4227",
  riskSoft: "#FCECE9",
  amber: "#EDA31E",
  amberSoft: "#FFF9E6",
  // Color propio para Papa Criolla (Tunja) — antes no tenía un color de
  // línea dedicado en el gráfico porque todos los productos se mezclaban
  // en una sola serie "Precio Predicho".
  tunja: "#3E6FD9",
};

// Metadatos compartidos entre la tabla (badges) y el gráfico (líneas),
// para que el nombre y el color de cada producto sean siempre los mismos
// en toda la vista, sin repetir strings sueltos por distintos lados.
const PRODUCTO_META = {
  papa_negra: { label: "Papa Negra", color: PALETA.primary },
  papa_amarilla_BOGOTA: { label: "Papa Criolla (Bogotá)", color: PALETA.amber },
  papa_amarilla_TUNJA: { label: "Papa Criolla (Tunja)", color: PALETA.tunja },
};

const getMetaProducto = (key) =>
  PRODUCTO_META[key] || { label: key || "Desconocido", color: PALETA.inkMuted };

// ─────────────────────────────────────────────────────────────────────────
// 🆕 Valores por defecto para las variables exógenas del simulador de curva
// diaria. Son los mismos "BASELINE" usados en PredictionPanel, para que la
// comparación arranque desde una condición de mercado típica.
// ─────────────────────────────────────────────────────────────────────────
const SIM_DEFAULTS = {
  precio_promedio: 2500,
  tmedia_c: 16,
  prec30_mm: 120,
  Cant_Ton_Total: 450,
  costo_total: 1800,
};

const PredictionHistoryDashboard = () => {
  // Filtros de búsqueda (tabla histórica)
  const [producto, setProducto] = useState("");
  const [horizonte, setHorizonte] = useState("");
  const [limite, setLimite] = useState(25);
  const [fechaPrediccion, setFechaPrediccion] = useState("");

  // Estados de carga y datos
  const [loading, setLoading] = useState(false);
  const [historicoData, setHistoricoData] = useState([]);
  const [error, setError] = useState(null);

  // Filtro de tabla: solo mostrar predicciones desde el día de hoy en
  // adelante (oculta las que ya quedaron en el pasado).
  const [soloFuturas, setSoloFuturas] = useState(true);

  // Medianoche de hoy (hora local), usada por el filtro de la tabla, el
  // gráfico histórico y el alineado de la curva simulada.
  const inicioHoy = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return hoy;
  }, []);

  // ───────────────────────────────────────────────────────────────────────
  // 🆕 COMPARACIÓN: curva diaria simulada (misma llamada que usa
  // PredictionPanel a /api/prediction-curve), para superponer contra la
  // curva histórica almacenada en Mongo, por producto.
  // ───────────────────────────────────────────────────────────────────────
  const [productoComparacion, setProductoComparacion] = useState("papa_negra");
  const [diasComparacion, setDiasComparacion] = useState(30);
  const [precioPromedioSim, setPrecioPromedioSim] = useState(
    SIM_DEFAULTS.precio_promedio,
  );
  const [tmediaCSim, setTmediaCSim] = useState(SIM_DEFAULTS.tmedia_c);
  const [prec30MmSim, setPrec30MmSim] = useState(SIM_DEFAULTS.prec30_mm);
  const [cantTonTotalSim, setCantTonTotalSim] = useState(
    SIM_DEFAULTS.Cant_Ton_Total,
  );
  const [costoTotalSim, setCostoTotalSim] = useState(SIM_DEFAULTS.costo_total);

  const [loadingComparacion, setLoadingComparacion] = useState(false);
  const [errorComparacion, setErrorComparacion] = useState(null);
  const [curvaComparacionData, setCurvaComparacionData] = useState([]);
  const [mostrarComparacion, setMostrarComparacion] = useState(false);

  // Si el usuario cambia el filtro principal de producto de la tabla, lo
  // reflejamos también en el selector de comparación (comodidad: es lo más
  // probable que quiera comparar el mismo producto que está filtrando).
  useEffect(() => {
    if (producto) setProductoComparacion(producto);
  }, [producto]);

  // Cargar datos por primera vez
  useEffect(() => {
    cargarHistorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarHistorial = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (producto) params.producto = producto;
      if (horizonte) params.horizonte = horizonte;
      if (limite) params.limite = limite;
      if (fechaPrediccion) params.fechaPrediccion = fechaPrediccion;

      const res = await API.get("/api/predictions-history", { params });
      if (res.data && res.data.data) {
        setHistoricoData(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error al cargar el histórico de MongoDB Atlas.");
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Genera la curva diaria simulada para el producto elegido en el panel
  // de comparación, reutilizando el mismo endpoint que "Ver Proyección
  // Diaria" en PredictionPanel. El backend arma internamente el DataFrame
  // con las 6 columnas y filtra por sí mismo cuáles usa cada horizonte, así
  // que es seguro enviar siempre el mismo set completo de variables.
  const generarCurvaComparacion = async () => {
    setLoadingComparacion(true);
    setErrorComparacion(null);
    try {
      const res = await API.get("/api/prediction-curve", {
        params: {
          producto: productoComparacion,
          dias: diasComparacion,
          precio_promedio: precioPromedioSim,
          tmedia_c: tmediaCSim,
          tmedia_c_lag20: tmediaCSim,
          prec30_mm: prec30MmSim,
          Cant_Ton_Total: cantTonTotalSim,
          costo_total: costoTotalSim,
        },
      });
      if (res.data && res.data.curva) {
        setCurvaComparacionData(res.data.curva);
        setMostrarComparacion(true);
      } else {
        setErrorComparacion("El motor LSTM no devolvió una curva válida.");
      }
    } catch (err) {
      console.error("Error generando la curva de comparación:", err);
      setErrorComparacion(
        err.response?.data?.message ||
          "No se pudo generar la curva simulada. Verifica que el motor LSTM (Puerto 8000) esté activo.",
      );
    } finally {
      setLoadingComparacion(false);
    }
  };

  const quitarComparacion = () => {
    setMostrarComparacion(false);
    setCurvaComparacionData([]);
    setErrorComparacion(null);
  };

  // Formateadores de datos para el agricultor
  const formatPrecio = (valor) => {
    if (valor === null || valor === undefined) return "N/A";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  };

  const formatFecha = (isoString) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return date.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getBadgeProducto = (nombreKey) => {
    const meta = getMetaProducto(nombreKey);
    return (
      <Badge
        bg={null}
        style={{
          backgroundColor: `${meta.color}22`,
          color: meta.color,
          border: `1px solid ${meta.color}55`,
          fontWeight: 700,
        }}
      >
        {meta.label}
      </Badge>
    );
  };

  // ─────────────────────────────────────────────────────────────────────
  // ORDEN DESCENDENTE POR FECHA DE PREDICCIÓN (tabla)
  // ─────────────────────────────────────────────────────────────────────
  const historicoOrdenado = useMemo(() => {
    const base = soloFuturas
      ? historicoData.filter(
          (item) =>
            item.fecha_prediccion &&
            new Date(item.fecha_prediccion) >= inicioHoy,
        )
      : historicoData;

    return [...base].sort((a, b) => {
      const fa = a.fecha_prediccion
        ? new Date(a.fecha_prediccion).getTime()
        : -Infinity;
      const fb = b.fecha_prediccion
        ? new Date(b.fecha_prediccion).getTime()
        : -Infinity;
      return fb - fa;
    });
  }, [historicoData, soloFuturas, inicioHoy]);

  // Exportación rápida a formato CSV para Excel (respeta el mismo orden de la tabla)
  const exportToCSV = () => {
    if (historicoOrdenado.length === 0) return;

    const headers =
      "ID,Producto,Fecha Ejecución,Fecha Proyección,Horizonte (Días),Precio Predicho /kg,Rango Mínimo /kg,Rango Máximo /kg\n";
    const rows = historicoOrdenado
      .map(
        (item) =>
          `"${item._id}","${item.producto}","${item.fecha_ejecucion}","${item.fecha_prediccion}",${item.horizonte_dias},${item.precio_predicho_COP_kg},${item.IC_inferior_95},${item.IC_superior_95}`,
      )
      .join("\n");

    const blob = new Blob([headers + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `historico_predicciones_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─────────────────────────────────────────────────────────────────────
  // DATOS DEL GRÁFICO: una serie (línea) POR PRODUCTO, eje X = día
  // calendario de FECHA PREDICCIÓN, SOLO desde hoy en adelante.
  //
  // 🆕 Si hay una curva simulada activa (mostrarComparacion), se fusiona
  // en el MISMO mapa por día calendario, agregando una serie extra por
  // producto con la etiqueta "(Simulado)". Así ambas curvas quedan en el
  // mismo eje X y se pueden comparar visualmente punto a punto.
  //
  // Alineación de fechas de la curva simulada: el backend de
  // /api/prediction-curve devuelve cada punto con "dia" (offset numérico
  // 1..N desde hoy). En vez de confiar en el formato del campo "fecha" que
  // devuelva el backend (que puede venir ya formateado para mostrar y no
  // ser parseable), calculamos la fecha real sumando ese offset a
  // inicioHoy — así garantizamos que cae exactamente en la misma columna
  // del eje X que usa la curva histórica.
  // ─────────────────────────────────────────────────────────────────────
  const { chartData, productosPresentes } = useMemo(() => {
    const mapaPorDia = new Map();
    const productosVistos = new Set();

    historicoData.forEach((item) => {
      if (!item.fecha_prediccion) return;
      if (new Date(item.fecha_prediccion) < inicioHoy) return;

      const meta = getMetaProducto(item.producto);
      productosVistos.add(item.producto);

      const claveDia = item.fecha_prediccion.split("T")[0];

      if (!mapaPorDia.has(claveDia)) {
        mapaPorDia.set(claveDia, {
          fecha: new Date(`${claveDia}T00:00:00`).toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "short",
          }),
          _ordenDia: claveDia,
        });
      }

      const punto = mapaPorDia.get(claveDia);
      const claveUltimaEjecucion = `__ultimaEjecucion__${meta.label}`;
      const ejecucionExistente = punto[claveUltimaEjecucion];

      if (
        !ejecucionExistente ||
        new Date(item.fecha_ejecucion) > new Date(ejecucionExistente)
      ) {
        punto[meta.label] = item.precio_predicho_COP_kg;
        punto[claveUltimaEjecucion] = item.fecha_ejecucion;
      }
    });

    const puntosOrdenados = Array.from(mapaPorDia.values()).sort(
      (a, b) => new Date(a._ordenDia) - new Date(b._ordenDia),
    );

    return {
      chartData: puntosOrdenados,
      productosPresentes: Array.from(productosVistos),
    };
  }, [historicoData, inicioHoy]);

  // ─────────────────────────────────────────────────────────────────────
  // 🆕 GRÁFICO DEDICADO DE COMPARACIÓN: a diferencia del gráfico anterior
  // (que mezcla las 3 variedades y se satura al agregar la simulación),
  // este solo toma el producto elegido en el panel de comparación y arma
  // dos series: "Histórico Almacenado" (filtrando historicoData por ese
  // producto) y "Simulado (LSTM)" (la curva diaria generada). Comparten el
  // mismo eje X (fecha calendario) que el gráfico principal.
  // ─────────────────────────────────────────────────────────────────────
  const comparacionChartData = useMemo(() => {
    if (!productoComparacion) return [];
    const mapaPorDia = new Map();

    historicoData
      .filter((item) => item.producto === productoComparacion)
      .forEach((item) => {
        if (!item.fecha_prediccion) return;
        if (new Date(item.fecha_prediccion) < inicioHoy) return;

        const claveDia = item.fecha_prediccion.split("T")[0];
        if (!mapaPorDia.has(claveDia)) {
          mapaPorDia.set(claveDia, {
            fecha: new Date(`${claveDia}T00:00:00`).toLocaleDateString(
              "es-CO",
              {
                day: "2-digit",
                month: "short",
              },
            ),
            _ordenDia: claveDia,
          });
        }

        const punto = mapaPorDia.get(claveDia);
        const claveUltimaEjecucion = "__ultimaEjecucionHist__";
        const ejecucionExistente = punto[claveUltimaEjecucion];

        if (
          !ejecucionExistente ||
          new Date(item.fecha_ejecucion) > new Date(ejecucionExistente)
        ) {
          punto["Histórico Almacenado"] = item.precio_predicho_COP_kg;
          punto[claveUltimaEjecucion] = item.fecha_ejecucion;
        }
      });

    if (mostrarComparacion) {
      curvaComparacionData.forEach((puntoSim) => {
        if (!puntoSim || typeof puntoSim.dia !== "number") return;

        const fechaPunto = new Date(inicioHoy);
        fechaPunto.setDate(fechaPunto.getDate() + puntoSim.dia);
        const claveDia = fechaPunto.toISOString().split("T")[0];

        if (!mapaPorDia.has(claveDia)) {
          mapaPorDia.set(claveDia, {
            fecha: fechaPunto.toLocaleDateString("es-CO", {
              day: "2-digit",
              month: "short",
            }),
            _ordenDia: claveDia,
          });
        }

        const filaChart = mapaPorDia.get(claveDia);
        filaChart["Simulado (LSTM)"] = puntoSim.precio_predicho_COP_kg;
        filaChart["__esAncla__Simulado (LSTM)"] = !!puntoSim.es_ancla;
      });
    }

    return Array.from(mapaPorDia.values()).sort(
      (a, b) => new Date(a._ordenDia) - new Date(b._ordenDia),
    );
  }, [
    historicoData,
    inicioHoy,
    productoComparacion,
    mostrarComparacion,
    curvaComparacionData,
  ]);

  const hayDatosComparacion =
    comparacionChartData.some((p) => p["Histórico Almacenado"] !== undefined) ||
    comparacionChartData.some((p) => p["Simulado (LSTM)"] !== undefined);

  // 🆕 Punto personalizado para la(s) serie(s) simulada(s): días con modelo
  // dedicado (1, 7, 30 — "es_ancla" del backend) se dibujan más grandes y
  // sólidos; los interpolados, pequeños. Genera un componente Dot por
  // serie porque la clave de la serie es dinámica (depende del producto).
  const makeSimDot = (claveSerie, color) => (props) => {
    const { cx, cy, payload } = props;
    if (payload?.[`__esAncla__${claveSerie}`]) {
      return (
        <Dot cx={cx} cy={cy} r={6} fill={color} stroke="#fff" strokeWidth={2} />
      );
    }
    return <Dot cx={cx} cy={cy} r={2.5} fill={color} stroke="none" />;
  };

  return (
    <div
      style={{ backgroundColor: PALETA.bg, minHeight: "100vh" }}
      className="py-4 px-2"
    >
      <Card
        className="shadow-sm border-0 rounded-4 overflow-hidden"
        style={{ maxWidth: "1200px", margin: "0 auto" }}
      >
        {/* Encabezado Principal */}
        <div
          className="p-4 text-white"
          style={{
            background: `linear-gradient(135deg, ${PALETA.primaryDark} 0%, #196611 100%)`,
          }}
        >
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h4 className="fw-bold m-0 d-flex align-items-center gap-2">
                <Calendar size={24} /> Historial de Predicciones Automáticas
                (MongoDB)
              </h4>
              <p className="m-0 mt-1 small opacity-75">
                Consulta los escenarios de mercado precalculados diariamente por
                el motor de inteligencia artificial.
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="light"
                size="sm"
                className="fw-bold text-success d-flex align-items-center gap-2"
                onClick={exportToCSV}
                disabled={historicoOrdenado.length === 0}
              >
                <FileSpreadsheet size={16} /> Exportar CSV
              </Button>
              <Button
                variant="outline-light"
                size="sm"
                className="fw-bold d-flex align-items-center gap-2"
                onClick={cargarHistorial}
              >
                <RefreshCw size={16} /> Refrescar
              </Button>
            </div>
          </div>
        </div>

        <Card.Body className="p-4">
          {/* Panel de Filtros */}
          <Card className="border-0 bg-light p-3 mb-4 rounded-3">
            <Form
              onSubmit={(e) => {
                e.preventDefault();
                cargarHistorial();
              }}
            >
              <Row className="g-3 align-items-end">
                <Col xs={12} md={3}>
                  <Form.Group>
                    <Form.Label className="fw-bold small text-muted d-flex align-items-center gap-1">
                      <Filter size={14} /> Filtrar por Producto
                    </Form.Label>
                    <Form.Select
                      value={producto}
                      onChange={(e) => setProducto(e.target.value)}
                    >
                      <option value="">-- Todos los Productos --</option>
                      <option value="papa_negra">Papa Negra</option>
                      <option value="papa_amarilla_BOGOTA">
                        Papa Criolla (Bogotá)
                      </option>
                      <option value="papa_amarilla_TUNJA">
                        Papa Criolla (Tunja)
                      </option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6} md={2}>
                  <Form.Group>
                    <Form.Label className="fw-bold small text-muted">
                      Horizonte
                    </Form.Label>
                    <Form.Select
                      value={horizonte}
                      onChange={(e) => setHorizonte(e.target.value)}
                    >
                      <option value="">-- Todos --</option>
                      <option value="1">1 día</option>
                      <option value="7">7 días</option>
                      <option value="30">30 días</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6} md={3}>
                  <Form.Group>
                    <Form.Label className="fw-bold small text-muted">
                      Fecha de Predicción
                    </Form.Label>
                    <Form.Control
                      type="date"
                      value={fechaPrediccion}
                      onChange={(e) => setFechaPrediccion(e.target.value)}
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6} md={2}>
                  <Form.Group>
                    <Form.Label className="fw-bold small text-muted">
                      Cantidad
                    </Form.Label>
                    <Form.Select
                      value={limite}
                      onChange={(e) => setLimite(Number(e.target.value))}
                    >
                      <option value={10}>Últimas 10</option>
                      <option value={25}>Últimas 25</option>
                      <option value={50}>Últimas 50</option>
                      <option value={100}>Últimas 100</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col xs={12} md={2}>
                  <Button
                    type="submit"
                    variant="success"
                    className="w-100 fw-bold d-flex align-items-center justify-content-center gap-2"
                    style={{ backgroundColor: PALETA.primary, border: "none" }}
                  >
                    <Search size={16} /> Consultar
                  </Button>
                </Col>
              </Row>

              <Row className="mt-3">
                <Col xs={12}>
                  <Form.Check
                    type="checkbox"
                    id="filtro-solo-futuras"
                    label="Mostrar solo predicciones desde hoy en adelante"
                    checked={soloFuturas}
                    onChange={(e) => setSoloFuturas(e.target.checked)}
                    className="fw-semibold small"
                    style={{ color: PALETA.ink }}
                  />
                </Col>
              </Row>
            </Form>
          </Card>

          {/* Alerta Informativa */}
          <Alert
            variant="info"
            className="border-0 shadow-sm rounded-3 d-flex gap-3 align-items-start"
            style={{ backgroundColor: PALETA.primarySoft, color: PALETA.ink }}
          >
            <Info className="text-success mt-1" size={20} />
            <div>
              <strong>¿Qué representa esta información?</strong> Estos datos
              provienen del proceso de análisis automatizado ejecutado cada
              noche por tu servidor de inteligencia artificial. No requieren que
              ingreses clima o costos de forma manual, lo que permite visualizar
              la tendencia de precios pura calculada con datos históricos reales
              consolidados en MongoDB Atlas.
            </div>
          </Alert>

          {/* Manejo de Error (histórico) */}
          {error && (
            <Alert variant="danger" className="rounded-3">
              {error}
            </Alert>
          )}

          {/* Gráfico de Tendencia Histórica de Predicciones (multi-producto) */}
          {historicoData.length > 0 && (
            <Card className="border-0 shadow-sm p-3 mb-4 bg-white rounded-4">
              <h6 className="fw-bold text-muted mb-1">
                📈 Curva de Comportamiento de las Predicciones Almacenadas
              </h6>
              <p className="small text-muted mb-3">
                El eje horizontal muestra la Fecha de Predicción desde hoy hacia
                adelante. Cada línea representa una variedad de papa distinta —
                el color y el nombre en la leyenda identifican el producto de
                cada punto.
              </p>
              {chartData.length === 0 ? (
                <div className="text-center py-4 text-muted small border rounded-3">
                  No hay predicciones con fecha de proyección desde hoy en
                  adelante entre los registros cargados. Prueba ampliar la
                  cantidad de resultados o quitar el filtro de fecha.
                </div>
              ) : (
                <div style={{ width: "100%", height: 340 }}>
                  <ResponsiveContainer>
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                      <YAxis
                        tickFormatter={(v) => `$${v}`}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value, name) => [formatPrecio(value), name]}
                        contentStyle={{
                          borderRadius: 8,
                          border: `1px solid ${PALETA.hairline}`,
                          fontSize: 12,
                        }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12 }}
                      />

                      {/* Líneas sólidas: histórico almacenado */}
                      {productosPresentes.map((key) => {
                        const meta = getMetaProducto(key);
                        return (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={meta.label}
                            name={meta.label}
                            stroke={meta.color}
                            strokeWidth={3}
                            dot={{ r: 4, fill: meta.color, strokeWidth: 0 }}
                            activeDot={{ r: 6 }}
                            connectNulls
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          )}

          {/* Tabla de Resultados */}
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="success" className="mb-2" />
              <p className="text-muted">
                Leyendo registros de MongoDB Atlas...
              </p>
            </div>
          ) : historicoOrdenado.length === 0 ? (
            <div className="text-center py-5 border rounded-3 bg-white">
              <p className="text-muted m-0">
                No se encontraron predicciones registradas con los filtros
                ingresados.
              </p>
            </div>
          ) : (
            <div className="table-responsive bg-white border rounded-3 shadow-sm">
              <Table hover className="align-middle m-0" responsive>
                <thead className="table-light">
                  <tr style={{ fontSize: "13px" }}>
                    <th className="py-3">PRODUCTO</th>
                    <th className="py-3">HORIZONTE</th>
                    <th className="py-3">FECHA EJECUCIÓN</th>
                    <th className="py-3">
                      FECHA PREDICCIÓN{" "}
                      <span className="text-muted fw-normal">
                        (mayor → menor)
                      </span>
                    </th>
                    <th className="py-3 text-end">PRECIO PREDICHO</th>
                    <th className="py-3 text-end">RANGO DE CONFIANZA (95%)</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: "14px" }}>
                  {historicoOrdenado.map((item) => (
                    <tr key={item._id}>
                      <td>{getBadgeProducto(item.producto)}</td>
                      <td>
                        <span className="fw-semibold text-dark">
                          {item.horizonte_dias}{" "}
                          {item.horizonte_dias === 1 ? "día" : "días"}
                        </span>
                      </td>
                      <td className="text-muted">
                        {formatFecha(item.fecha_ejecucion)}
                      </td>
                      <td className="text-muted">
                        {item.fecha_prediccion
                          ? item.fecha_prediccion.split("T")[0]
                          : "N/A"}
                      </td>
                      <td
                        className="text-end fw-bold text-success"
                        style={{ fontFamily: "IBM Plex Mono" }}
                      >
                        {formatPrecio(item.precio_predicho_COP_kg)}
                      </td>
                      <td
                        className="text-end text-muted"
                        style={{
                          fontFamily: "IBM Plex Mono",
                          fontSize: "12.5px",
                        }}
                      >
                        <span className="text-danger">
                          {formatPrecio(item.IC_inferior_95)}
                        </span>
                        {" - "}
                        <span style={{ color: PALETA.primaryDark }}>
                          {formatPrecio(item.IC_superior_95)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              🆕 PANEL DE COMPARACIÓN: al final de todo, para no revolver
              los filtros/tabla principal con el simulador. Genera la curva
              diaria simulada (misma lógica que "Ver Proyección Diaria" de
              PredictionPanel) para compararla contra la curva histórica
              almacenada de un solo producto.
             ───────────────────────────────────────────────────────────── */}
          <hr className="my-4" style={{ borderColor: PALETA.hairline }} />

          <Card
            className="border-0 shadow-sm p-3 mb-4 rounded-4"
            style={{
              backgroundColor: "#fdfdfb",
              border: `1px solid ${PALETA.hairline}`,
            }}
          >
            <h6
              className="fw-bold d-flex align-items-center gap-2 mb-1"
              style={{ color: PALETA.ink }}
            >
              <Sparkles size={16} color={PALETA.primaryDark} /> Comparar contra
              Proyección Diaria Simulada (LSTM)
            </h6>
            <p className="small text-muted mb-3">
              Simula un escenario con tus propias variables de entorno y
              compáralo, en el gráfico dedicado de abajo, contra la curva
              histórica almacenada del mismo producto.
            </p>

            <Row className="g-3 align-items-end">
              <Col xs={12} sm={6} md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted">
                    Producto a Simular
                  </Form.Label>
                  <Form.Select
                    value={productoComparacion}
                    onChange={(e) => setProductoComparacion(e.target.value)}
                  >
                    {Object.entries(PRODUCTO_META).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} sm={6} md={2}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted">
                    Días a Simular
                  </Form.Label>
                  <Form.Select
                    value={diasComparacion}
                    onChange={(e) =>
                      setDiasComparacion(parseInt(e.target.value))
                    }
                  >
                    <option value={7}>7 días</option>
                    <option value={15}>15 días</option>
                    <option value={30}>30 días</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={4} className="d-flex gap-2">
                <Button
                  className="w-100 fw-bold d-flex align-items-center justify-content-center gap-2"
                  style={{ backgroundColor: PALETA.primary, border: "none" }}
                  onClick={generarCurvaComparacion}
                  disabled={loadingComparacion}
                >
                  {loadingComparacion ? (
                    <>
                      <Spinner animation="border" size="sm" /> Simulando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Generar y Comparar
                    </>
                  )}
                </Button>
                {mostrarComparacion && (
                  <Button
                    variant="outline-secondary"
                    className="fw-bold d-flex align-items-center justify-content-center gap-1"
                    onClick={quitarComparacion}
                    title="Quitar comparación del gráfico"
                  >
                    <X size={16} />
                  </Button>
                )}
              </Col>
            </Row>

            {/* Variables exógenas del escenario simulado */}
            <Row className="g-3 mt-1">
              <Col xs={12} sm={6} md={4}>
                <Form.Label className="small text-muted mb-0">
                  Precio Último Cierre:{" "}
                  <strong>
                    ${precioPromedioSim.toLocaleString("es-CO")}/kg
                  </strong>
                </Form.Label>
                <Form.Range
                  min={500}
                  max={6000}
                  step={50}
                  value={precioPromedioSim}
                  onChange={(e) =>
                    setPrecioPromedioSim(parseInt(e.target.value))
                  }
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Form.Label className="small text-muted mb-0">
                  Temperatura Media: <strong>{tmediaCSim} °C</strong>
                </Form.Label>
                <Form.Range
                  min={5}
                  max={32}
                  step={1}
                  value={tmediaCSim}
                  onChange={(e) => setTmediaCSim(parseInt(e.target.value))}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Form.Label className="small text-muted mb-0">
                  Precipitación Acum. (30d): <strong>{prec30MmSim} mm</strong>
                </Form.Label>
                <Form.Range
                  min={0}
                  max={400}
                  step={5}
                  value={prec30MmSim}
                  onChange={(e) => setPrec30MmSim(parseInt(e.target.value))}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Form.Label className="small text-muted mb-0">
                  Abastecimiento en Plaza:{" "}
                  <strong>{cantTonTotalSim} Ton</strong>
                </Form.Label>
                <Form.Range
                  min={50}
                  max={1000}
                  step={10}
                  value={cantTonTotalSim}
                  onChange={(e) => setCantTonTotalSim(parseInt(e.target.value))}
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Form.Label className="small text-muted mb-0">
                  Costos Totales Insumos:{" "}
                  <strong>${costoTotalSim.toLocaleString("es-CO")}/kg</strong>
                </Form.Label>
                <Form.Range
                  min={500}
                  max={4000}
                  step={50}
                  value={costoTotalSim}
                  onChange={(e) => setCostoTotalSim(parseInt(e.target.value))}
                />
              </Col>
            </Row>

            {errorComparacion && (
              <Alert variant="danger" className="rounded-3 mt-3 mb-0 small">
                {errorComparacion}
              </Alert>
            )}

            {mostrarComparacion && curvaComparacionData.length > 0 && (
              <Alert
                variant="success"
                className="rounded-3 mt-3 mb-0 small border-0"
                style={{
                  backgroundColor: PALETA.primarySoft,
                  color: PALETA.ink,
                }}
              >
                Comparando{" "}
                <strong>{getMetaProducto(productoComparacion).label}</strong> —
                curva simulada superpuesta (línea punteada) sobre el histórico
                almacenado en el gráfico de abajo.
              </Alert>
            )}
          </Card>

          {/* 🆕 GRÁFICO DEDICADO: Histórico vs Simulado, UN SOLO producto
              (el elegido en el panel de arriba). Va al final de todo para
              no revolver la vista principal del histórico. */}
          {productoComparacion && hayDatosComparacion && (
            <Card className="border-0 shadow-sm p-3 mb-4 bg-white rounded-4">
              <h6 className="fw-bold text-muted mb-1 d-flex align-items-center gap-2">
                <Sparkles size={16} color={PALETA.primaryDark} />
                Comparación Individual —{" "}
                {getMetaProducto(productoComparacion).label}
              </h6>
              <p className="small text-muted mb-3">
                Vista dedicada a un solo producto: la línea sólida es lo
                almacenado en el histórico de MongoDB, la línea punteada es la
                simulación generada arriba con tus variables de entorno.
              </p>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <LineChart
                    data={comparacionChartData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                    <YAxis
                      tickFormatter={(v) => `$${v}`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value, name) => [formatPrecio(value), name]}
                      contentStyle={{
                        borderRadius: 8,
                        border: `1px solid ${PALETA.hairline}`,
                        fontSize: 12,
                      }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />

                    <Line
                      type="monotone"
                      dataKey="Histórico Almacenado"
                      name="Histórico Almacenado"
                      stroke={getMetaProducto(productoComparacion).color}
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: getMetaProducto(productoComparacion).color,
                        strokeWidth: 0,
                      }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="Simulado (LSTM)"
                      name="Simulado (LSTM)"
                      stroke={PALETA.ink}
                      strokeWidth={2.5}
                      strokeDasharray="6 4"
                      dot={makeSimDot("Simulado (LSTM)", PALETA.ink)}
                      activeDot={{ r: 7 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default PredictionHistoryDashboard;

