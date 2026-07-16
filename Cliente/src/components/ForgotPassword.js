import React, { Component } from "react";
import { Form, Button, Card, Container, Alert } from "react-bootstrap";
import { Link } from "react-router-dom";
import API from "../axios/axiosConfig";

export default class ForgotPassword extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cedula: "",
      preguntaSeguridad: "", // Traída dinámicamente del backend
      respuestaSeguridad: "",
      newPassword: "",
      error: "",
      successMessage: "",
      showRegisterLink: false,
      step: 1, // Controla si busca la cédula (1) o si responde la pregunta (2)
    };
  }

  // Paso 1: Validar cédula y extraer su pregunta
  handleVerifyCedula = async (e) => {
    e.preventDefault();
    this.setState({ error: "", showRegisterLink: false });

    try {
      const res = await API.post("/users/get-question", {
        cedula: this.state.cedula,
      });
      if (res.data.ok) {
        this.setState({
          preguntaSeguridad: res.data.preguntaSeguridad,
          step: 2,
        });
      }
    } catch (error) {
      const type = error.response?.data?.type;
      const message = error.response?.data?.message;

      if (type === "NOT_FOUND") {
        this.setState({
          error: message || "Esta cédula no está registrada.",
          showRegisterLink: true,
        });
      } else {
        this.setState({ error: message || "Error al verificar el documento." });
      }
    }
  };

  // Paso 2: Validar respuesta y cambiar la contraseña
  handleSubmitReset = async (e) => {
    e.preventDefault();
    this.setState({ error: "" });

    try {
      const res = await API.post("/users/reset-password", {
        cedula: this.state.cedula,
        respuestaSeguridad: this.state.respuestaSeguridad,
        newPassword: this.state.newPassword,
      });

      this.setState({ successMessage: res.data.message });

      setTimeout(() => {
        this.props.history.push("/login");
      }, 2500);
    } catch (error) {
      this.setState({
        error:
          error.response?.data?.message || "Error al actualizar la contraseña.",
      });
    }
  };

  render() {
    const agriforecastStyles = {
      glassCard: {
        background: "rgba(255, 255, 255, 0.5)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(94, 75, 60, 0.15)",
        boxShadow: "0 12px 30px rgba(94, 75, 60, 0.12)",
      },
      title: { color: "#5e4b3c", fontWeight: "800", fontSize: "1.4rem" },
      inputStyle: {
        background: "#ffffff",
        border: "1px solid rgba(94, 75, 60, 0.25)",
        padding: "12px 15px",
        color: "#5e4b3c",
      },
      submitButton: {
        background: "#4db806",
        border: "none",
        color: "#212529",
        borderRadius: "25px",
        padding: "11px 0",
        fontWeight: "700",
      },
    };

    return (
      <div style={{ minHeight: "85vh", display: "flex", alignItems: "center" }}>
        <Container className="py-5" style={{ maxWidth: "460px" }}>
          <Card
            className="p-3 p-md-4 border-0 rounded-4 shadow-lg"
            style={agriforecastStyles.glassCard}
          >
            <Card.Body>
              <div className="text-center mb-4">
                <div className="mb-2" style={{ fontSize: "2.5rem" }}>
                  {this.state.step === 1 ? "🔍" : "🔒"}
                </div>
                <h4 style={agriforecastStyles.title} className="text-uppercase">
                  Recuperar Acceso
                </h4>
                <p className="text-muted small">
                  {this.state.step === 1
                    ? "Ingrese su cédula para verificar su identidad en el sistema."
                    : "Responda a su pregunta clave para asignar la nueva clave."}
                </p>
              </div>

              {this.state.error && (
                <Alert
                  variant="danger"
                  className="rounded-3 small py-2 border-0 shadow-sm fw-medium"
                >
                  ⚠️ {this.state.error}
                </Alert>
              )}
              {this.state.successMessage && (
                <Alert
                  variant="success"
                  className="rounded-3 small py-2 fw-semibold border-0 shadow-sm"
                  style={{
                    backgroundColor: "rgba(77, 184, 6, 0.15)",
                    color: "#2e6f03",
                  }}
                >
                  ✅ {this.state.successMessage}
                </Alert>
              )}

              {/* FORMATO EN PASO 1: BUSCAR CÉDULA */}
              {this.state.step === 1 ? (
                <Form onSubmit={this.handleVerifyCedula}>
                  <Form.Group className="mb-4">
                    <Form.Label
                      className="small fw-bold"
                      style={{ color: "#5e4b3c" }}
                    >
                      Número de Cédula
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Ej: 10234567"
                      value={this.state.cedula}
                      onChange={(e) =>
                        this.setState({ cedula: e.target.value })
                      }
                      style={agriforecastStyles.inputStyle}
                      className="rounded-3 shadow-sm custom-input-focus"
                      required
                    />
                  </Form.Group>
                  <Button
                    type="submit"
                    className="w-100 text-uppercase fw-bold shadow-sm"
                    style={agriforecastStyles.submitButton}
                  >
                    {" "}
                    Verificar Identidad{" "}
                  </Button>
                </Form>
              ) : (
                /* FORMATO EN PASO 2: RESPONDER PREGUNTA SEGURA Y PONER NUEVA CLAVE */
                <Form onSubmit={this.handleSubmitReset}>
                  <div
                    className="alert alert-sm p-2 rounded-3 small mb-3 fw-bold"
                    style={{
                      background: "rgba(94, 75, 60, 0.1)",
                      color: "#5e4b3c",
                    }}
                  >
                    Pregunta: ¿{this.state.preguntaSeguridad}?
                  </div>

                  <Form.Group className="mb-3">
                    <Form.Label
                      className="small fw-bold"
                      style={{ color: "#5e4b3c" }}
                    >
                      Su Respuesta Secreta
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Escriba su respuesta exacta"
                      value={this.state.respuestaSeguridad}
                      onChange={(e) =>
                        this.setState({ respuestaSeguridad: e.target.value })
                      }
                      style={agriforecastStyles.inputStyle}
                      className="rounded-3 shadow-sm custom-input-focus"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label
                      className="small fw-bold"
                      style={{ color: "#5e4b3c" }}
                    >
                      Nueva Contraseña
                    </Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={this.state.newPassword}
                      onChange={(e) =>
                        this.setState({ newPassword: e.target.value })
                      }
                      style={agriforecastStyles.inputStyle}
                      className="rounded-3 shadow-sm custom-input-focus"
                      required
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    className="w-100 text-uppercase fw-bold shadow-sm"
                    style={agriforecastStyles.submitButton}
                  >
                    {" "}
                    Restablecer Clave{" "}
                  </Button>
                  <Button
                    variant="link"
                    className="w-100 text-center mt-2 btn-sm text-muted small shadow-none text-decoration-none"
                    onClick={() => this.setState({ step: 1 })}
                  >
                    ← Cambiar Cédula
                  </Button>
                </Form>
              )}

              {this.state.showRegisterLink ? (
                <div
                  className="mt-4 pt-3 border-top text-center alert rounded-4 p-3"
                  style={{
                    backgroundColor: "rgba(77, 184, 6, 0.08)",
                    border: "1px solid rgba(77, 184, 6, 0.25)",
                  }}
                >
                  <p
                    className="mb-2 small fw-bold"
                    style={{ color: "#5e4b3c" }}
                  >
                    ¿Aún no te encuentras registrado?
                  </p>
                  <Link
                    to="/signup"
                    className="btn btn-sm rounded-pill px-4 shadow-sm w-100 btn-dark fw-bold"
                  >
                    👨‍🌾 Crear un Perfil de Campesino
                  </Link>
                </div>
              ) : (
                <div className="mt-4 pt-3 border-top text-center">
                  <Link
                    to="/login"
                    style={{
                      color: "#5e4b3c",
                      textDecoration: "none",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                    }}
                  >
                    ← Volver al Login
                  </Link>
                </div>
              )}
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }
}
