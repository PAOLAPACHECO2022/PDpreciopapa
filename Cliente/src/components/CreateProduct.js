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

export default class CreateProduct extends Component {
  constructor(props) {
    super(props);
    const today = new Date().toISOString().substring(0, 10);

    this.state = {
      name: "",
      descripcion: "",
      precio: "",
      cantidad: "", // 💡 Ahora guardará un valor puramente numérico
      estado: "activo",
      fecha: today,
      redirect: false,

      // 🎭 Estados agregados para el control del nuevo Modal premium
      showSuccessModal: false,
      showErrorModal: false,
      backendErrorMsg: "",
    };
  }

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = (e) => {
    e.preventDefault();

    const productObject = {
      name: this.state.name,
      descripcion: this.state.descripcion,
      precio: Number(this.state.precio),
      cantidad: Number(this.state.cantidad), // 🛠️ Forzamos conversión a número antes de enviar
      estado: this.state.estado,
      fecha: this.state.fecha,
    };

    // 🚀 La cabecera 'Authorization: Bearer <token>' se añade sola gracias al interceptor
    API.post("/products/create-product", productObject)
      .then((res) => {
        // En lugar de alert(), abrimos el modal de éxito estilizado
        this.setState({ showSuccessModal: true });
      })
      .catch((error) => {
        console.error(error);
        const errorMsg =
          error.response?.data?.message ||
          "Verifique sus permisos o campos obligatorios.";

        // En lugar de alert(), abrimos el modal de error con el mensaje dinámico
        this.setState({
          showErrorModal: true,
          backendErrorMsg: errorMsg,
        });
      });
  };

  // 🚪 Función para cerrar el modal de éxito e iniciar la redirección fluida
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
              />
              <h3
                className="mb-0 text-uppercase tracking-wide"
                style={brandStyles.title}
              >
                Crear Nuevo Producto
              </h3>
            </div>

            <Form onSubmit={this.onSubmit}>
              <Row>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={brandStyles.label}>
                      Nombre del Producto *
                    </Form.Label>
                    <Form.Control
                      name="name"
                      type="text"
                      placeholder="Ej: Papa Criolla"
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
                      Fecha de Ingreso *
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
                <Form.Label style={brandStyles.label}>
                  Estado Inicial
                </Form.Label>
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
                <Form.Label style={brandStyles.label}>
                  Descripción Detallada *
                </Form.Label>
                <Form.Control
                  name="descripcion"
                  as="textarea"
                  rows={3}
                  placeholder="Escriba sobre la calidad, tamaño, disponibilidad..."
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
                      Precio ($) *
                    </Form.Label>
                    <Form.Control
                      name="precio"
                      type="number"
                      placeholder="Ej: 4500"
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
                      Cantidad (En Kilogramos) *
                    </Form.Label>
                    <Form.Control
                      name="cantidad"
                      type="number"
                      placeholder="Ej: 50"
                      value={this.state.cantidad}
                      onChange={this.handleChange}
                      style={brandStyles.inputStyle}
                      className="rounded-3 shadow-sm"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex flex-column flex-sm-row gap-3 mt-4 pt-2">
                <Button
                  type="submit"
                  style={brandStyles.saveButton}
                  className="px-4 shadow-sm fw-bold w-100 w-sm-auto order-1 order-sm-2"
                >
                  💾 Guardar Producto
                </Button>
                <Link
                  to="/product-list"
                  style={brandStyles.cancelButton}
                  className="w-100 w-sm-auto justify-content-center order-2 order-sm-1"
                >
                  Cancelar
                </Link>
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
              🎉 ¡Registro Exitoso!
            </Modal.Title>
          </Modal.Header>
          <Modal.Body
            className="text-center p-4"
            style={{ backgroundColor: "#fdfdfb" }}
          >
            <div className="my-3 display-4 text-success">🥔</div>
            <h5 className="fw-bold mb-2" style={{ color: "#5e4b3c" }}>
              ¡Cultivo Guardado Correctamente!
            </h5>
            <p className="text-muted small mb-0">
              El producto ha sido indexado en el inventario de la plataforma y
              ya se encuentra disponible para su respectiva gestión y consulta
              técnica.
            </p>
          </Modal.Body>
          <Modal.Footer className="border-0 justify-content-center bg-light">
            <Button
              style={brandStyles.modalConfirmButton}
              onClick={this.handleAcceptSuccess}
              className="shadow-sm"
            >
              Ver Inventario
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
              No se pudo guardar el registro
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
              Corregir Datos
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    );
  }
}
