import React, { Component } from "react";
import {
  Form,
  Button,
  Col,
  Row,
  Card,
  Container,
  Image,
  Alert,
} from "react-bootstrap";
import { Link, Redirect } from "react-router-dom";
// 🔄 Importamos nuestra configuración personalizada de Axios
import API from "../../../axios/axiosConfig";

// 🖼️ IMPORTACIÓN DE IMÁGENES (Mejor Práctica en React)
import logoHandshake from "../../../components/imagenes/LogoAgriForecast.jpg";

export default class RegisterForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      nombres: "",
      apellidos: "",
      cedula: "",
      celular: "",
      telfijo: "",
      direccion: "",
      departamento: "",
      municipio: "",
      email: "",
      password: "",
      // 🔒 NUEVOS ESTADOS DE SEGURIDAD
      preguntaSeguridad: "",
      respuestaSeguridad: "",
      id: "",
      redirect: false,
      message: null, // Para mostrar mensajes de éxito o error
      messageType: null, // 'success' o 'danger'
    };
  }

  handleChange = (e) => {
    this.setState({ [e.target.id]: e.target.value });
  };

  handleSubmit = (e) => {
    e.preventDefault();

    // 💡 Extraemos id, redirect y los mensajes para NO enviarlos al backend
    const { id, redirect, message, messageType, ...datosAEnviar } = this.state;

    // Ocultar mensajes anteriores
    this.setState({ message: null });

    // Validar que se haya escogido una pregunta de seguridad
    if (!datosAEnviar.preguntaSeguridad) {
      this.setState({
        message: "❌ Por favor, seleccione una pregunta de seguridad.",
        messageType: "danger",
      });
      return;
    }

    // 🚀 Enviamos los datos limpios (incluyendo los nuevos campos de seguridad)
    API.post("/users/register", datosAEnviar)
      .then((res) => {
        if (res.data.ok) {
          // Mostrar mensaje de éxito
          this.setState({
            message:
              "¡Registro exitoso! Por favor inicia sesión para ingresar al sistema.",
            messageType: "success",
          });

          // Redirigir al login después de 3 segundos
          setTimeout(() => {
            this.setState({ redirect: true });
          }, 3000);
        }
      })
      .catch((error) => {
        let errorMsg = "No se pudo conectar con el servidor.";

        if (error.response && error.response.data) {
          errorMsg =
            error.response.data.error || "Hubo un error en el registro.";
          if (errorMsg.includes("cedula")) {
            errorMsg = "❌ Ya existe un usuario registrado con esta Cédula.";
          } else if (errorMsg.includes("email")) {
            errorMsg = "❌ Este correo electrónico ya está en uso.";
          }
        }

        // Mostrar mensaje de error
        this.setState({
          message: errorMsg,
          messageType: "danger",
        });
        console.error(error);
      });
  };

  render() {
    // Redirecciona a la vista de login para ingresar formalmente
    if (this.state.redirect) {
      return <Redirect to="/login" />;
    }

    // Estilos personalizados para emular el diseño de glassmorphism
    const agriforecastStyles = {
      glassCard: {
        background: "rgba(255, 255, 255, 0.4)", // Transparencia
        backdropFilter: "blur(10px)", // Desenfoque de fondo
        border: "1px solid rgba(255, 255, 255, 0.2)",
        color: "#5e4b3c", // Color de texto marrón suave
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)", // Sombra suave
      },
      input: {
        background: "rgba(255, 255, 255, 0.9)", // Fondo casi blanco
        border: "none",
        borderRadius: "8px",
        color: "#5e4b3c",
        padding: "12px 15px",
        fontWeight: "normal",
      },
      logoHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center", // Centrado horizontal
        color: "#5e4b3c", // Tono marrón del logo
        fontWeight: "600",
        fontSize: "1.5rem",
      },
      sectionTitle: {
        color: "#5e4b3c", // Tono marrón oscuro para los títulos de sección
        fontWeight: "700",
        fontSize: "1.2rem",
        lineHeight: "1",
        textShadow: "1px 1px 1px rgba(255,255,255,0.5)", // Sombra de texto para legibilidad
      },
      cancelButton: {
        background: "transparent",
        color: "#8d6e63", // Tono marrón claro para el botón de cancelar
        border: "2px solid #8d6e63",
        borderRadius: "20px",
        padding: "10px 20px",
        fontWeight: "bold",
        fontSize: "1rem",
        textDecoration: "none",
        transition: "all 0.3s ease",
      },
      submitButton: {
        background: "#4db806", // Verde brillante del botón "Crear Cuenta Ahora"
        border: "none",
        borderRadius: "20px",
        padding: "10px 30px",
        fontWeight: "bold",
        fontSize: "1rem",
        color: "#212529", // Letra oscura para legibilidad
        transition: "background 0.3s ease",
      },
      descriptionText: {
        color: "#5e4b3c",
        fontSize: "0.95rem",
      },
    };

    // Estilos globales de fondo para emular el campo
    const backgroundStyle = {
      backgroundSize: "cover",
      backgroundPosition: "center",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
    };

    return (
      <div style={backgroundStyle}>
        <Container className="mt-4 mb-5">
          <Row className="justify-content-center">
            <Col md={10} lg={8} xl={7}>
              <Form onSubmit={this.handleSubmit}>
                <Card
                  className="shadow border-0 rounded-4"
                  style={agriforecastStyles.glassCard}
                >
                  <Card.Body className="p-5">
                    {/* Sección de Logo */}
                    <div
                      style={agriforecastStyles.logoHeader}
                      className="mb-4 justify-content-center align-items-center"
                    >
                      <Image
                        src={logoHandshake}
                        alt="AgriForecast Logo"
                        height="45"
                        className="me-2"
                      />
                      <div className="text-start">
                        <div style={{ lineHeight: "1.2" }}>AgriForecast</div>
                        <div
                          style={{
                            fontWeight: "normal",
                            fontSize: "1.2rem",
                            lineHeight: "1",
                          }}
                        >
                          Papa
                        </div>
                      </div>
                    </div>

                    <h2
                      className="mb-3 text-center"
                      style={agriforecastStyles.sectionTitle}
                    >
                      REGISTRO DE USUARIO
                    </h2>
                    <p
                      className="mb-5 text-center"
                      style={agriforecastStyles.descriptionText}
                    >
                      Completa tus datos para crear una cuenta en AgriForecast
                      Papa.
                    </p>

                    {/* Mensaje de Éxito o Error */}
                    {this.state.message && (
                      <Alert
                        variant={this.state.messageType}
                        className="rounded-4 mb-4 text-center"
                      >
                        {this.state.message}
                      </Alert>
                    )}

                    <h5
                      className="text-start mb-4"
                      style={agriforecastStyles.sectionTitle}
                    >
                      Datos Personales
                    </h5>
                    <Row>
                      <Col md={6}>
                        <Form.Group
                          className="mb-4 text-start"
                          controlId="nombres"
                        >
                          <Form.Label className="fw-bold d-none">
                            Nombres
                          </Form.Label>
                          <Form.Control
                            required
                            placeholder="Ej: Juan"
                            onChange={this.handleChange}
                            style={agriforecastStyles.input}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group
                          className="mb-4 text-start"
                          controlId="apellidos"
                        >
                          <Form.Label className="fw-bold d-none">
                            Apellidos
                          </Form.Label>
                          <Form.Control
                            required
                            placeholder="Ej: Pérez"
                            onChange={this.handleChange}
                            style={agriforecastStyles.input}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group
                          className="mb-4 text-start"
                          controlId="cedula"
                        >
                          <Form.Label className="fw-bold d-none">
                            Cédula
                          </Form.Label>
                          <Form.Control
                            type="number"
                            required
                            placeholder="Número de identificación"
                            onChange={this.handleChange}
                            style={agriforecastStyles.input}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group
                          className="mb-4 text-start"
                          controlId="celular"
                        >
                          <Form.Label className="fw-bold d-none">
                            Celular
                          </Form.Label>
                          <Form.Control
                            type="number"
                            required
                            placeholder="Ej: 3001234567"
                            onChange={this.handleChange}
                            style={agriforecastStyles.input}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <h5
                      className="text-start mt-4 mb-4"
                      style={agriforecastStyles.sectionTitle}
                    >
                      Ubicación
                    </h5>
                    <Form.Group
                      className="mb-4 text-start"
                      controlId="direccion"
                    >
                      <Form.Label className="fw-bold d-none">
                        Dirección
                      </Form.Label>
                      <Form.Control
                        required
                        placeholder="Dirección de la Finca / Hogar"
                        onChange={this.handleChange}
                        style={agriforecastStyles.input}
                      />
                    </Form.Group>

                    <Row>
                      <Col md={6}>
                        <Form.Group
                          className="mb-4 text-start"
                          controlId="departamento"
                        >
                          <Form.Label className="fw-bold d-none">
                            Departamento
                          </Form.Label>
                          <Form.Control
                            required
                            placeholder="Departamento"
                            onChange={this.handleChange}
                            style={agriforecastStyles.input}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group
                          className="mb-4 text-start"
                          controlId="municipio"
                        >
                          <Form.Label className="fw-bold d-none">
                            Municipio
                          </Form.Label>
                          <Form.Control
                            required
                            placeholder="Municipio"
                            onChange={this.handleChange}
                            style={agriforecastStyles.input}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <h5
                      className="text-start mt-4 mb-4"
                      style={agriforecastStyles.sectionTitle}
                    >
                      Seguridad de la Cuenta
                    </h5>
                    <Row>
                      <Col md={6}>
                        <Form.Group
                          className="mb-4 text-start"
                          controlId="email"
                        >
                          <Form.Label className="fw-bold d-none">
                            Correo Electrónico
                          </Form.Label>
                          <Form.Control
                            type="email"
                            required
                            placeholder="usuario@correo.com"
                            onChange={this.handleChange}
                            style={agriforecastStyles.input}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group
                          className="mb-4 text-start"
                          controlId="password"
                        >
                          <Form.Label className="fw-bold d-none">
                            Contraseña
                          </Form.Label>
                          <Form.Control
                            type="password"
                            required
                            placeholder="Contraseña (mín. 6 caracteres)"
                            onChange={this.handleChange}
                            style={agriforecastStyles.input}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    {/* 🔒 NUEVA SECCIÓN: PREGUNTA Y RESPUESTA CLAVE DE SEGURIDAD */}
                    <Row>
                      <Col md={6}>
                        <Form.Group
                          className="mb-4 text-start"
                          controlId="preguntaSeguridad"
                        >
                          <Form.Label className="fw-bold d-none">
                            Pregunta de Seguridad
                          </Form.Label>
                          <Form.Select
                            required
                            value={this.state.preguntaSeguridad}
                            onChange={this.handleChange}
                            style={agriforecastStyles.input}
                          >
                            <option value="">
                              -- Seleccione una Pregunta Clave --
                            </option>
                            <option value="¿Cuál fue su primer cultivo exitoso?">
                              ¿Cuál fue su primer cultivo exitoso?
                            </option>
                            <option value="¿Cómo se llamaba su primera mascota del campo?">
                              ¿Cómo se llamaba su primera mascota del campo?
                            </option>
                            <option value="¿Cuál es el nombre de su comunidad o vereda natal?">
                              ¿Cuál es el nombre de su comunidad o vereda natal?
                            </option>
                            <option value="¿Cuál es su marca o tipo de tractor/herramienta favorita?">
                              ¿Cuál es su marca o tipo de tractor/herramienta
                              favorita?
                            </option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group
                          className="mb-5 text-start"
                          controlId="respuestaSeguridad"
                        >
                          <Form.Label className="fw-bold d-none">
                            Respuesta Secreta
                          </Form.Label>
                          <Form.Control
                            type="text"
                            required
                            placeholder="Escriba su respuesta secreta"
                            onChange={this.handleChange}
                            style={agriforecastStyles.input}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <div className="d-grid gap-3 d-md-flex justify-content-md-end pt-4">
                      <Link
                        to="/"
                        style={agriforecastStyles.cancelButton}
                        className="px-4 me-md-2"
                      >
                        Cancelar
                      </Link>
                      <Button
                        type="submit"
                        style={agriforecastStyles.submitButton}
                        className="px-5 fw-bold"
                      >
                        Crear Cuenta Ahora
                      </Button>
                    </div>

                    <div
                      className="mt-5 text-center text-muted"
                      style={{ fontSize: "0.8rem" }}
                    >
                      Nuestras predicciones se basan en análisis de datos
                      avanzados y modelos de IA.
                    </div>
                  </Card.Body>
                </Card>
              </Form>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}
