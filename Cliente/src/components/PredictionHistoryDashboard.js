import React, { useState, useEffect } from "react";
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
} from "recharts";
import {
  Calendar,
  Search,
  RefreshCw,
  Filter,
  FileSpreadsheet,
  Info,
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
};

const PredictionHistoryDashboard = () => {
  // Filtros de búsqueda
  const [producto, setProducto] = useState("");
  const [horizonte, setHorizonte] = useState("");
  const [limite, setLimite] = useState(25);
  const [fechaPrediccion, setFechaPrediccion] = useState(""); // 🆕 Nuevo estado de filtro de fecha

  // Estados de carga y datos
  const [loading, setLoading] = useState(false);
  const [historicoData, setHistoricoData] = useState([]);
  const [error, setError] = useState(null);

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
      if (fechaPrediccion) params.fechaPrediccion = fechaPrediccion; // 🆕 Enviamos la fecha seleccionada

      // Llamada al endpoint de Node
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

  // Formateadores de datos para el agricultor
  const formatPrecio = (valor) => {
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
    if (nombreKey === "papa_negra") {
      return (
        <Badge style={{ backgroundColor: PALETA.primary, color: "#fff" }}>
          Papa Negra
        </Badge>
      );
    }
    if (nombreKey === "papa_amarilla_BOGOTA") {
      return (
        <Badge style={{ backgroundColor: PALETA.amber, color: PALETA.ink }}>
          Criolla (Bogotá)
        </Badge>
      );
    }
    return <Badge bg="secondary">Criolla (Tunja)</Badge>;
  };

  // Exportación rápida a formato CSV para Excel
  const exportToCSV = () => {
    if (historicoData.length === 0) return;

    const headers =
      "ID,Producto,Fecha Ejecución,Fecha Proyección,Horizonte (Días),Precio Predicho /kg,Rango Mínimo /kg,Rango Máximo /kg\n";
    const rows = historicoData
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

  // Preparar datos para el gráfico
  const rawChartData = [...historicoData].reverse().map((item) => ({
    fecha: new Date(item.fecha_ejecucion).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
    }),
    "Precio Predicho": item.precio_predicho_COP_kg,
    "Rango Mínimo": item.IC_inferior_95,
    "Rango Máximo": item.IC_superior_95,
    producto: item.producto === "papa_negra" ? "Papa Negra" : "Papa Criolla",
  }));

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
                disabled={historicoData.length === 0}
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

                {/* 🆕 NUEVO FILTRO: Selección de fecha de proyección */}
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

          {/* Manejo de Error */}
          {error && (
            <Alert variant="danger" className="rounded-3">
              {error}
            </Alert>
          )}

          {/* Gráfico de Tendencia Histórica de Predicciones */}
          {historicoData.length > 0 && (
            <Card className="border-0 shadow-sm p-3 mb-4 bg-white rounded-4">
              <h6 className="fw-bold text-muted mb-3">
                📈 Curva de Comportamiento de las Predicciones Almacenadas
              </h6>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <LineChart
                    data={rawChartData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                    <YAxis
                      tickFormatter={(v) => `$${v}`}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip formatter={(value) => [formatPrecio(value), ""]} />
                    <Legend iconType="circle" />
                    <Line
                      type="monotone"
                      dataKey="Precio Predicho"
                      stroke={PALETA.primary}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Rango Mínimo"
                      stroke={PALETA.risk}
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Rango Máximo"
                      stroke={PALETA.amber}
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
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
          ) : historicoData.length === 0 ? (
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
                    <th className="py-3">FECHA PREDICCIÓN</th>
                    <th className="py-3 text-end">PRECIO PREDICHO</th>
                    <th className="py-3 text-end">RANGO DE CONFIANZA (95%)</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: "14px" }}>
                  {historicoData.map((item) => (
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
        </Card.Body>
      </Card>
    </div>
  );
};

export default PredictionHistoryDashboard;
