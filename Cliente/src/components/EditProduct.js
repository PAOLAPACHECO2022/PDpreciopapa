import React, { Component } from "react";
// 🔄 Importamos tu configuración centralizada de Axios con interceptores de Token
import API from "../axios/axiosConfig";
import {
  Form,
  Button,
  Container,
  Row,
  Col,
  Card,
  Modal,
} from "react-bootstrap";
import { Redirect, Link } from "react-router-dom";

export default class EditProduct extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: "",
      descripcion: "",
      precio: "",
      cantidad: "",
      estado: "",
      fecha: "",
      redirect: false,

      // 🎭 Estados agregados para el control de los modales premium
      showSuccessModal: false,
      showErrorModal: false,
      backendErrorMsg: "",
    };
  }

  componentDidMount() {
    const id = this.props.match.params.id;
    // 🚀 GET seguro usando la instancia compartida
    API.get(`/products/edit-product/${id}`)
      .then((res) => {
        const fechaDB = res.data.fecha ? res.data.fecha.substring(0, 10) : "";

        this.setState({
          name: res.data.name,
          descripcion: res.data.descripcion,
          precio: res.data.precio,
          cantidad: res.data.cantidad,
          estado: res.data.estado,
          fecha: fechaDB,
        });
      })
      .catch((err) => {
        console.error("Error al cargar producto:", err);
        this.setState({
          showErrorModal: true,
          backendErrorMsg:
            "No se pudieron recuperar los datos del servidor para este producto.",
        });
      });
  }

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();
    const id = this.props.match.params.id;

    const updatedProduct = {
      name: this.state.name,
      descripcion: this.state.descripcion,
      precio: Number(this.state.precio),
      cantidad: Number(this.state.cantidad), // 🛠️ Corregido a Number para que coincida con tu esquema
      estado: this.state.estado,
      fecha: this.state.fecha,
    };

    // 🚀 PUT seguro con JWT inyectado automáticamente
    API.put(`/products/update-product/${id}`, updatedProduct)
      .then((res) => {
        this.setState({ showSuccessModal: true });
      })
      .catch((error) => {
        console.error(error);
        const errorMsg =
          error.response?.data?.msg ||
          "Asegúrate de haber iniciado sesión y de ser el propietario de este producto.";
        this.setState({
          showErrorModal: true,
          backendErrorMsg: errorMsg,
        });
      });
  };

  // 🚪 Controladores de flujo para los botones del Modal
  handleAcceptSuccess = () => {
    this.setState({ showSuccessModal: false, redirect: true });
  };

  handleCloseError = () => {
    this.setState({ showErrorModal: false });
  };

  render() {
    if (this.state.redirect) {
      return <Redirect to="/product-list" />;
    }

    // 🎨 Identidad AgriForecast unificada
    const brandStyles = {
      title: {
        color: "#5e4b3c",
        fontWeight: "800",
        fontSize: "1.6rem",
      },
      label: {
        color: "#5e4b3c",
        fontWeight: "600",
        fontSize: "0.95rem",
      },
      inputStyle: {
        border: "1px solid rgba(94, 75, 60, 0.25)",
        padding: "10px 15px",
        color: "#333",
      },
      saveButton: {
        background: "#4db806",
        border: "none",
        color: "#212529",
        borderRadius: "25px",
        padding: "10px 28px",
        fontWeight: "bold",
        boxShadow: "0 4px 10px rgba(77, 184, 6, 0.2)",
      },
      cancelButton: {
        border: "2px solid #5e4b3c",
        color: "#5e4b3c",
        borderRadius: "25px",
        padding: "8px 24px",
        fontWeight: "bold",
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
      },
      modalHeaderSuccess: {
        background: "#4db806",
        color: "#212529",
      },
      modalHeaderError: {
        background: "#c62828",
        color: "#ffffff",
      },
      modalConfirmButton: {
        background: "#5e4b3c",
        border: "none",
        color: "#ffffff",
        borderRadius: "20px",
        padding: "8px 25px",
        fontWeight: "bold",
      },
    };

    return (
      <Container className="my-5 d-flex justify-content-center">
        <Card className="p-2 p-md-4 bg-white shadow rounded-4 border-0 w-100 col-lg-9 mx-auto">
          <Card.Body>
            <div className="d-flex align-items-center mb-4 pb-2 border-bottom">
              <img
                alt="icon"
                src="https://cdn-icons-png.flaticon.com/512/2622/2622693.png"
                width="38"
                height="38"
                className="me-3"
                style={{ filter: "hue-rotate(45deg)" }}
              />
              <h3
                className="mb-0 text-uppercase tracking-wide"
                style={brandStyles.title}
              >
                Editar Producto
              </h3>
            </div>

            <Form onSubmit={this.onSubmit}>
              <Row>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={brandStyles.label}>
                      Nombre del Producto
                    </Form.Label>
                    <Form.Control
                      name="name"
                      type="text"
                      value={this.state.name}
                      onChange={this.handleChange}
                      style={brandStyles.inputStyle}
                      className="rounded-3 shadow-sm"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={brandStyles.label}>
                      Fecha de Registro
                    </Form.Label>
                    <Form.Control
                      name="fecha"
                      type="date"
                      value={this.state.fecha}
                      onChange={this.handleChange}
                      style={brandStyles.inputStyle}
                      className="rounded-3 shadow-sm"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label style={brandStyles.label}>Estado</Form.Label>
                <Form.Select
                  name="estado"
                  value={this.state.estado}
                  onChange={this.handleChange}
                  style={brandStyles.inputStyle}
                  className="rounded-3 shadow-sm"
                >
                  <option value="activo">Activo (Disponible para venta)</option>
                  <option value="inactivo">
                    Inactivo (Borrador / Agotado)
                  </option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label style={brandStyles.label}>Descripción</Form.Label>
                <Form.Control
                  name="descripcion"
                  as="textarea"
                  rows={3}
                  value={this.state.descripcion}
                  onChange={this.handleChange}
                  style={brandStyles.inputStyle}
                  className="rounded-3 shadow-sm"
                  required
                />
              </Form.Group>

              <Row>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={brandStyles.label}>
                      Precio ($)
                    </Form.Label>
                    <Form.Control
                      name="precio"
                      type="number"
                      value={this.state.precio}
                      onChange={this.handleChange}
                      style={brandStyles.inputStyle}
                      className="rounded-3 shadow-sm"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={brandStyles.label}>
                      Cantidad (Kg)
                    </Form.Label>
                    <Form.Control
                      name="cantidad"
                      type="number"
                      value={this.state.cantidad}
                      onChange={this.handleChange}
                      style={brandStyles.inputStyle}
                      className="rounded-3 shadow-sm"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex flex-column flex-sm-row justify-content-between gap-3 mt-4 pt-2">
                <Link
                  to="/product-list"
                  style={brandStyles.cancelButton}
                  className="w-100 w-sm-auto justify-content-center order-2 order-sm-1"
                >
                  Cancelar
                </Link>
                <Button
                  type="submit"
                  style={brandStyles.saveButton}
                  className="px-4 shadow-sm fw-bold w-100 w-sm-auto order-1 order-sm-2"
                >
                  💾 Guardar Cambios
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>

        {/* 🟩 MODAL PREMIUM DE ÉXITO */}
        <Modal
          show={this.state.showSuccessModal}
          onHide={this.handleAcceptSuccess}
          centered
          className="rounded-4 overflow-hidden"
        >
          <Modal.Header
            style={brandStyles.modalHeaderSuccess}
            className="border-0"
          >
            <Modal.Title className="fw-bold fs-5">
              ✨ Actualización Exitosa
            </Modal.Title>
          </Modal.Header>
          <Modal.Body
            className="text-center p-4"
            style={{ backgroundColor: "#fdfdfb" }}
          >
            <div className="my-3 display-4 text-success">📝</div>
            <h5 className="fw-bold mb-2" style={{ color: "#5e4b3c" }}>
              ¡Cambios Guardados!
            </h5>
            <p className="text-muted small mb-0">
              Las modificaciones de calidad, precio o stock del producto han
              sido procesadas con éxito en el inventario central.
            </p>
          </Modal.Body>
          <Modal.Footer className="border-0 justify-content-center bg-light">
            <Button
              style={brandStyles.modalConfirmButton}
              onClick={this.handleAcceptSuccess}
              className="shadow-sm"
            >
              Volver al Inventario
            </Button>
          </Modal.Footer>
        </Modal>

        {/* 🟥 MODAL PREMIUM DE ERROR */}
        <Modal
          show={this.state.showErrorModal}
          onHide={this.handleCloseError}
          centered
          className="rounded-4 overflow-hidden"
        >
          <Modal.Header
            style={brandStyles.modalHeaderError}
            className="border-0"
          >
            <Modal.Title className="fw-bold fs-5">
              ❌ Error en la Operación
            </Modal.Title>
          </Modal.Header>
          <Modal.Body
            className="text-center p-4"
            style={{ backgroundColor: "#fdfdfb" }}
          >
            <div className="my-3 display-4 text-danger">⚠️</div>
            <h5 className="fw-bold mb-2" style={{ color: "#5e4b3c" }}>
              No se pudo actualizar el producto
            </h5>
            <p className="text-muted small mb-0">
              {this.state.backendErrorMsg}
            </p>
          </Modal.Body>
          <Modal.Footer className="border-0 justify-content-center bg-light">
            <Button
              variant="secondary"
              onClick={this.handleCloseError}
              className="rounded-pill px-4 fw-bold"
            >
              Revisar Formulario
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    );
  }
}
