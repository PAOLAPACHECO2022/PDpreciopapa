import React, { Component } from "react";
import {
  Container,
  Form,
  Button,
  Card,
  Image,
  Row,
  Col,
  Alert, // 🔔 Importado para mostrar alertas nativas elegantes
} from "react-bootstrap";
// 🔄 Importamos 'withRouter' para manejar redirecciones limpias por historial
import { Link, withRouter } from "react-router-dom";
import API from "../../axios/axiosConfig";

import logoAgriForecast from "../imagenes/LogoAgriForecast.jpg";

class LoginForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      email: "",
      password: "",
      // 🔒 NUEVOS ESTADOS PARA GESTIONAR MENSAJES BONITOS
      message: null,
      messageType: null, // 'success', 'danger' o 'warning'
    };
  }

  handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  handleSubmit = (e) => {
    e.preventDefault();

    // Limpiamos alertas previas al intentar iniciar sesión
    this.setState({ message: null });

    const userObject = {
      email: this.state.email,
      password: this.state.password,
    };

    API.post("/users/login", userObject)
      .then((res) => {
        if (res.data.ok) {
          const token = res.data.token;
          const cedulaUser = res.data.user?.cedula;

          if (!cedulaUser) {
            this.setState({
              message:
                "⚠️ Autenticación exitosa, pero no se encontró la cédula asociada en el sistema.",
              messageType: "warning",
            });
            return;
          }

          // 🔑 1. Guardamos las credenciales en el almacenamiento local
          window.localStorage.setItem("token", token);
          window.localStorage.setItem("cedula", cedulaUser);

          // 🚀 2. REDIRECCIÓN DIRECTA AL HOME
          this.props.history.push("/home");
        }
      })
      .catch((error) => {
        console.error(error);

        let errorMsg = "Correo o contraseña incorrectos.";

        // Si el backend envía un error específico de credenciales, lo atrapamos de manera sutil
        if (error.response && error.response.data) {
          errorMsg =
            error.response.data.message || "Usuario o contraseña incorrectos.";
        }

        this.setState({
          message: `❌ ${errorMsg}`,
          messageType: "danger",
        });
      });
  };

  render() {
    // Estilos personalizados de AgriForecast
    const agriforecastStyles = {
      glassCard: {
        background: "rgba(255, 255, 255, 0.4)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        color: "#5e4b3c",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
      },
      input: {
        background: "rgba(255, 255, 255, 0.9)",
        border: "none",
        borderRadius: "8px",
        color: "#5e4b3c",
        padding: "12px 15px",
        fontWeight: "normal",
      },
      logoHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#5e4b3c",
        fontWeight: "600",
        fontSize: "1.5rem",
      },
      welcomeText: {
        color: "#5e4b3c",
        fontWeight: "700",
        fontSize: "1.4rem",
        textShadow: "1px 1px 1px rgba(255,255,255,0.5)",
      },
      descriptionText: {
        color: "#5e4b3c",
        fontSize: "0.95rem",
      },
      loginButton: {
        background: "#4db806",
        border: "none",
        borderRadius: "20px",
        padding: "10px 0",
        fontWeight: "bold",
        fontSize: "1rem",
        color: "#212529",
      },
      linkText: {
        color: "#5e4b3c",
        textDecoration: "none",
        fontSize: "0.9rem",
      },
    };

    return (
      <Form onSubmit={this.handleSubmit}>
        <Card
          className="shadow border-0 rounded-4"
          style={agriforecastStyles.glassCard}
        >
          <Card.Body className="p-5 text-center">
            {/* Sección de Logo */}
            <div
              style={agriforecastStyles.logoHeader}
              className="mb-4 justify-content-center align-items-center"
            >
              <Image
                src={logoAgriForecast}
                alt="AgriForecast Logo"
                height="45"
                className="me-2"
              />
              <div className="text-start">
                <div style={{ lineHeight: "1.2" }}>AgriForecast</div>
                <div
                  style={{
                    fontWeight: "normal",
                    fontSize: "1rem",
                    lineHeight: "1",
                  }}
                >
                  Papa
                </div>
              </div>
            </div>

            {/* Texto de Bienvenida */}
            <h2 className="mb-2" style={agriforecastStyles.welcomeText}>
              ¡Bienvenido a AgriForecast!
            </h2>
            <p className="mb-4" style={agriforecastStyles.descriptionText}>
              Predicciones de precios de papa precisas y oportunas.
            </p>

            {/* 🔔 AVISOS BONITOS INTEGRADOS EN LA INTERFAZ */}
            {this.state.message && (
              <Alert
                variant={this.state.messageType}
                className="rounded-3 mb-4 text-center py-2 fw-medium"
              >
                {this.state.message}
              </Alert>
            )}

            {/* Campo Correo Electrónico */}
            <Form.Group className="mb-4 text-start">
              <div className="input-group">
                <span className="input-group-text bg-white border-0 rounded-start-pill text-muted p-3">
                  <i className="bi bi-person-fill"></i>
                </span>
                <Form.Control
                  name="email"
                  type="email"
                  placeholder="Nombre de Usuario o Correo"
                  onChange={this.handleChange}
                  required
                  style={{
                    ...agriforecastStyles.input,
                    borderRadius: "0 8px 8px 0",
                  }}
                  className="rounded-end-pill"
                />
              </div>
            </Form.Group>

            {/* Campo Contraseña */}
            <Form.Group className="mb-5 text-start">
              <div className="input-group">
                <span className="input-group-text bg-white border-0 rounded-start-pill text-muted p-3">
                  <i className="bi bi-lock-fill"></i>
                </span>
                <Form.Control
                  name="password"
                  type="password"
                  placeholder="Contraseña"
                  onChange={this.handleChange}
                  required
                  style={{
                    ...agriforecastStyles.input,
                    borderRadius: "0 8px 8px 0",
                  }}
                  className="rounded-end-pill"
                />
              </div>
            </Form.Group>

            {/* Botón de Iniciar Sesión */}
            <Button
              type="submit"
              className="w-100 mb-4"
              style={agriforecastStyles.loginButton}
            >
              Iniciar Sesión
            </Button>

            {/* Enlaces inferiores */}
            <div className="text-center">
              <Link to="/forgot-password" style={agriforecastStyles.linkText}>
                ¿Olvidó su contraseña?
              </Link>
              <div className="mt-2">
                <Link
                  to="/signup"
                  style={{ ...agriforecastStyles.linkText, fontWeight: "bold" }}
                >
                  Crear una cuenta
                </Link>
              </div>
            </div>

            <div className="mt-5 text-muted" style={{ fontSize: "0.8rem" }}>
              Nuestras predicciones se basan en análisis de datos avanzados y
              modelos de IA.
            </div>
          </Card.Body>
        </Card>
      </Form>
    );
  }
}

// 📦 Conectamos el formulario con el enrutador
const RoutedLoginForm = withRouter(LoginForm);

const backgroundStyle = {
  backgroundSize: "cover",
  backgroundPosition: "center",
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

// Componente contenedor principal exportado
export default class Login extends Component {
  render() {
    return (
      <div style={backgroundStyle}>
        <Container>
          <Row className="justify-content-center">
            <Col md={7} lg={6} xl={5}>
              <RoutedLoginForm />
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}
