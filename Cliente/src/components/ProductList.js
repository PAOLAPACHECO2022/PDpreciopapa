import React, { Component } from "react";
import API from "../axios/axiosConfig";
import {
  Table,
  Form,
  Row,
  Col,
  Container,
  Card,
  Modal,
  Button,
  ListGroup,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import ProductTableRow from "./ProductTableRow";

export default class ProductList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      products: [],
      searchTerm: "",
      statusFilter: "todos",
      // Estados para el Modal de datos de usuario
      showModal: false,
      creadorSeleccionado: null,
      loadingCreador: false,
      usuarioActualId: localStorage.getItem("cedula") || "",
    };
  }

  componentDidMount() {
    this.fetchProducts();
  }

  fetchProducts = () => {
    API.get("/products/")
      .then((res) => {
        const sortedProducts = res.data.sort((a, b) => {
          const dateA = new Date(a.fecha);
          const dateB = new Date(b.fecha);
          if (dateB - dateA !== 0) return dateB - dateA;
          return b._id.localeCompare(a._id);
        });
        this.setState({ products: sortedProducts });
      })
      .catch((error) => console.error("Error al obtener inventario:", error));
  };

  // 📞 Buscar los detalles del Agricultor dueño del registro en la DB
  // 📞 Buscar los detalles del Agricultor mediante su cédula en la DB
  handleVerContacto = (creadorCedula) => {
    this.setState({
      showModal: true,
      loadingCreador: true,
      creadorSeleccionado: null,
    });

    // 🎯 Apuntamos a la ruta correcta que lee cédulas: /users/:cedula
    API.get(`/users/${creadorCedula}`)
      .then((res) => {
        // Tu controlador responde con un objeto envuelto en { ok: true, ...user } o directo el usuario.
        // Evaluamos ambas opciones por seguridad:
        const userData = res.data.ok ? res.data : res.data;
        this.setState({ creadorSeleccionado: userData, loadingCreador: false });
      })
      .catch((err) => {
        console.error("Error al obtener datos del creador:", err);
        this.setState({ loadingCreador: false });
        alert("No se pudieron cargar los datos de contacto del productor.");
      });
  };
  handleCloseModal = () => {
    this.setState({ showModal: false, creadorSeleccionado: null });
  };

  handleSearch = (e) => this.setState({ searchTerm: e.target.value });
  handleStatusFilter = (e) => this.setState({ statusFilter: e.target.value });

  renderTableData() {
    const { products, searchTerm, statusFilter, usuarioActualId } = this.state;

    return products
      .filter((product) => {
        const matchesName =
          product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          false;
        const matchesStatus =
          statusFilter === "todos" || product.estado === statusFilter;
        return matchesName && matchesStatus;
      })
      .map((res, i) => {
        return (
          <ProductTableRow
            obj={res}
            key={res._id || i}
            usuarioActualId={usuarioActualId}
            onVerContacto={this.handleVerContacto}
            refreshTable={this.fetchProducts}
          />
        );
      });
  }

  render() {
    const { showModal, creadorSeleccionado, loadingCreador } = this.state;

    const brandStyles = {
      title: { color: "#5e4b3c", fontWeight: "800", letterSpacing: "0.5px" },
      tableHeader: {
        background: "#4db806",
        color: "#212529",
        fontWeight: "bold",
      },
      mainButton: {
        background: "#4db806",
        border: "none",
        color: "#212529",
        borderRadius: "25px",
        padding: "10px 24px",
        fontWeight: "bold",
      },
      secondaryButton: {
        border: "2px solid #5e4b3c",
        color: "#5e4b3c",
        borderRadius: "25px",
        padding: "10px 24px",
        fontWeight: "bold",
      },
      filterLabel: { color: "#5e4b3c", fontWeight: "600", fontSize: "0.9rem" },
      inputStyle: {
        background: "rgba(255, 255, 255, 0.9)",
        border: "1px solid rgba(94, 75, 60, 0.2)",
        padding: "10px 15px",
        color: "#5e4b3c",
      },
      modalHeader: { background: "#5e4b3c", color: "#fff" },
    };

    return (
      <Container className="my-5">
        <Card className="border-0 shadow rounded-4 overflow-hidden">
          <Card.Body className="p-4 p-md-5">
            <h2
              className="text-center mb-4 text-uppercase"
              style={brandStyles.title}
            >
              📦 GESTIÓN DE INVENTARIO
            </h2>

            {/* Filtros */}
            <Row
              className="mb-4 g-3 p-3 rounded-3 mx-0 border-0 shadow-sm"
              style={{ backgroundColor: "#f8f6f2" }}
            >
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label style={brandStyles.filterLabel}>
                    🔍 Buscar por nombre
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Escriba para filtrar cultivos..."
                    onChange={this.handleSearch}
                    className="rounded-pill shadow-sm"
                    style={brandStyles.inputStyle}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label style={brandStyles.filterLabel}>
                    🚦 Filtrar por Estado
                  </Form.Label>
                  <Form.Select
                    onChange={this.handleStatusFilter}
                    className="rounded-pill shadow-sm"
                    style={brandStyles.inputStyle}
                  >
                    <option value="todos">Todos los productos</option>
                    <option value="activo">Solo Disponibles (Activos)</option>
                    <option value="inactivo">Solo Agotados (Inactivos)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* Tabla */}
            <div className="table-responsive rounded-3 shadow-sm border">
              <Table hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th style={brandStyles.tableHeader} className="p-3">
                      📅 Fecha
                    </th>
                    <th style={brandStyles.tableHeader} className="p-3">
                      🥔 Nombre
                    </th>
                    <th style={brandStyles.tableHeader} className="p-3">
                      📝 Descripción
                    </th>
                    <th style={brandStyles.tableHeader} className="p-3">
                      💰 Precio
                    </th>
                    <th style={brandStyles.tableHeader} className="p-3">
                      ⚖️ Cant/Kg.
                    </th>
                    <th style={brandStyles.tableHeader} className="p-3">
                      📍 Estado
                    </th>
                    <th
                      style={brandStyles.tableHeader}
                      className="p-3 text-center"
                    >
                      ⚙️ Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>{this.renderTableData()}</tbody>
              </Table>
            </div>

            {this.state.products.length === 0 && (
              <div className="text-center my-5 py-4 text-muted bg-light rounded-3 border border-dashed">
                <p className="mb-0 fw-semibold">
                  No se encontraron productos en el inventario actual.
                </p>
              </div>
            )}

            <hr className="my-4 opacity-25" />

            <div className="d-flex flex-column flex-sm-row justify-content-center align-items-center gap-3">
              <Link
                to="/create-product"
                className="btn btn-lg w-100 w-sm-auto text-center"
                style={brandStyles.mainButton}
              >
                + Crear Nuevo Producto
              </Link>
              <Link
                to="/dashboard"
                className="btn btn-lg w-100 w-sm-auto text-center"
                style={brandStyles.secondaryButton}
              >
                📊 Ver Estadísticas
              </Link>
            </div>
          </Card.Body>
        </Card>

        {/* 🏬 MODAL DE INFORMACIÓN DE CONTACTO DEL CREADOR */}
        <Modal
          show={showModal}
          onHide={this.handleCloseModal}
          centered
          size="md"
          className="rounded-4 overflow-hidden"
        >
          <Modal.Header
            closeButton
            style={brandStyles.modalHeader}
            closeVariant="white"
          >
            <Modal.Title className="fs-5 fw-bold">
              👨‍🌾 Datos del Productor Agrícola
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4" style={{ backgroundColor: "#fdfdfb" }}>
            {loadingCreador && (
              <div className="text-center py-4">
                <div
                  className="spinner-border text-success"
                  role="status"
                ></div>
                <p className="mt-2 text-muted small">
                  Cargando datos de contacto...
                </p>
              </div>
            )}

            {creadorSeleccionado && (
              <div>
                <div className="text-center mb-3">
                  <div
                    className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center shadow-sm"
                    style={{ width: "70px", height: "70px", fontSize: "2rem" }}
                  >
                    🌾
                  </div>
                  <h5
                    className="fw-bold mt-2 mb-0"
                    style={{ color: "#5e4b3c" }}
                  >
                    {creadorSeleccionado.nombres}{" "}
                    {creadorSeleccionado.apellidos}
                  </h5>
                  <p className="text-muted small">
                    Productor Certificado en AgriForecast
                  </p>
                </div>

                <ListGroup
                  variant="flush"
                  className="rounded-3 border shadow-sm"
                >
                  <ListGroup.Item className="d-flex justify-content-between py-2 small">
                    <span className="text-muted fw-bold">📱 Celular:</span>
                    <span className="fw-semibold text-dark">
                      {creadorSeleccionado.celular}
                    </span>
                  </ListGroup.Item>
                  {creadorSeleccionado.telfijo && (
                    <ListGroup.Item className="d-flex justify-content-between py-2 small">
                      <span className="text-muted fw-bold">
                        ☎️ Teléfono Fijo:
                      </span>
                      <span className="text-dark">
                        {creadorSeleccionado.telfijo}
                      </span>
                    </ListGroup.Item>
                  )}
                  <ListGroup.Item className="d-flex justify-content-between py-2 small">
                    <span className="text-muted fw-bold">
                      📧 Correo Electrónico:
                    </span>
                    <span className="text-dark">
                      {creadorSeleccionado.email}
                    </span>
                  </ListGroup.Item>
                  <ListGroup.Item className="d-flex justify-content-between py-2 small">
                    <span className="text-muted fw-bold">📍 Ubicación:</span>
                    <span className="text-dark text-end">
                      {creadorSeleccionado.municipio},{" "}
                      {creadorSeleccionado.departamento}
                    </span>
                  </ListGroup.Item>
                  {creadorSeleccionado.direccion && (
                    <ListGroup.Item className="d-flex justify-content-between py-2 small">
                      <span className="text-muted fw-bold">
                        🏠 Dirección / Finca:
                      </span>
                      <span className="text-dark">
                        {creadorSeleccionado.direccion}
                      </span>
                    </ListGroup.Item>
                  )}
                </ListGroup>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="border-0 bg-light d-flex justify-content-center">
            <Button
              variant="secondary"
              onClick={this.handleCloseModal}
              className="rounded-pill px-4 fw-bold shadow-sm"
              style={{ background: "#5e4b3c", border: "none" }}
            >
              Entendido
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    );
  }
}
