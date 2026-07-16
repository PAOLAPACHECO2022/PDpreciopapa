import React, { Component } from "react";
import { Form, Col, Row, Button, Container } from "react-bootstrap";
import axios from "axios";

export default class Search extends Component {
  constructor(props) {
    super(props);
    this.state = {
      disabled: true,
      user: {
        nombres: "",
        apellidos: "",
        cedula: "",
        celular: "",
        telfijo: "",
        direccion: "",
        departamento: "",
        municipio: "",
        email: "",
        // 🔒 Inicializamos los campos de seguridad adicionales
        preguntaSeguridad: "",
        respuestaSeguridad: "",
      },
    };
  }

  handleChange = (e) => {
    const { name, value } = e.target;
    this.setState((prevState) => ({
      user: { ...prevState.user, [name]: value },
    }));
  };

  componentDidMount() {
    this.cargarDatosUsuario();
  }

  cargarDatosUsuario = () => {
    const token = window.localStorage.getItem("token");
    const cedulaGuardada = window.localStorage.getItem("cedula");

    if (cedulaGuardada) {
      axios
        .get(`http://localhost:4000/users/${cedulaGuardada}`, {
          headers: { "auth-token": token },
        })
        .then((res) => {
          const userData = res.data;
          userData.password = "";
          // Nos aseguramos de que si vienen vacíos desde el backend, no rompan los inputs controlados
          if (!userData.preguntaSeguridad) userData.preguntaSeguridad = "";
          if (!userData.respuestaSeguridad) userData.respuestaSeguridad = "";

          this.setState({ user: userData });
        })
        .catch((error) => {
          console.error("Error al traer datos registrados:", error);
        });
    }
  };

  handleToggleEdit = () => {
    this.setState({ disabled: !this.state.disabled });
  };

  handleActualizar = (e) => {
    e.preventDefault();

    // Importamos SweetAlert2 dinámicamente
    const Swal = require("sweetalert2");

    const token = window.localStorage.getItem("token");
    const cedula = this.state.user.cedula;

    // Clonamos y limpiamos el objeto
    const datosEnviar = { ...this.state.user };
    delete datosEnviar._id;
    delete datosEnviar.__v;
    delete datosEnviar.createdAt;
    delete datosEnviar.updatedAt;

    if (!datosEnviar.password) {
      delete datosEnviar.password;
    }

    // Validación extra antes de enviar
    if (datosEnviar.preguntaSeguridad && !datosEnviar.respuestaSeguridad) {
      Swal.fire({
        icon: "warning",
        title: "Seguridad incompleta",
        text: "Si seleccionas una pregunta de seguridad, debes ingresar una respuesta secreta.",
        confirmButtonColor: "#dc3545",
      });
      return;
    }

    // Alerta de carga estética mientras procesa la base de datos
    Swal.fire({
      title: "Guardando cambios...",
      text: "Por favor, espera un momento.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    axios
      .put(`http://localhost:4000/users/update/${cedula}`, datosEnviar, {
        headers: { "auth-token": token },
      })
      .then((res) => {
        // Alerta de éxito moderna con los colores verdes de AgriForecast
        Swal.fire({
          icon: "success",
          title: "¡Perfil Actualizado!",
          text: "Tus datos se guardaron correctamente. Si cambiaste tu pregunta de seguridad, se usará en tu próxima recuperación.",
          confirmButtonColor: "#4db806", // El color verde de tus botones
        });

        this.setState({ disabled: true });
        this.cargarDatosUsuario();
      })
      .catch((err) => {
        const errMsg =
          err.response?.data?.message || "No se pudieron actualizar los datos.";

        // Alerta de error elegante
        Swal.fire({
          icon: "error",
          title: "Error al actualizar",
          text: errMsg,
          confirmButtonColor: "#dc3545",
        });
      });
  };

  render() {
    const { user, disabled } = this.state;

    // Estilo personalizado para botones verdes del sistema
    const greenButtonStyle = {
      backgroundColor: "#4db806",
      borderColor: "#4db806",
      color: "#ffffff",
    };

    return (
      <Container className="my-5">
        <div className="p-4 bg-white rounded shadow-sm border">
          <h2
            className="text-center font-weight-bold h4 mb-4 text-uppercase"
            style={{ color: "#4db806" }}
          >
            Mi Perfil Registrado
          </h2>

          <Form onSubmit={this.handleActualizar}>
            <fieldset disabled={disabled}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Nombres</Form.Label>
                    <Form.Control
                      name="nombres"
                      value={user.nombres}
                      onChange={this.handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Apellidos</Form.Label>
                    <Form.Control
                      name="apellidos"
                      value={user.apellidos}
                      onChange={this.handleChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Cédula (ID)</Form.Label>
                    <Form.Control
                      name="cedula"
                      value={user.cedula}
                      readOnly
                      className="bg-light"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Celular</Form.Label>
                    <Form.Control
                      name="celular"
                      value={user.celular}
                      onChange={this.handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">
                      Correo Electrónico
                    </Form.Label>
                    <Form.Control
                      name="email"
                      value={user.email}
                      onChange={this.handleChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Municipio</Form.Label>
                    <Form.Control
                      name="municipio"
                      value={user.municipio}
                      onChange={this.handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Departamento</Form.Label>
                    <Form.Control
                      name="departamento"
                      value={user.departamento}
                      onChange={this.handleChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* 🔒 NUEVA SECCIÓN DE SEGURIDAD MODIFICABLE PARA EL AGRICULTOR */}
              <hr className="my-4" />
              <h5 className="mb-3 font-weight-bold h6 text-muted text-uppercase">
                Seguridad de Recuperación
              </h5>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">
                      Pregunta de Seguridad
                    </Form.Label>
                    <Form.Select
                      name="preguntaSeguridad"
                      value={user.preguntaSeguridad}
                      onChange={this.handleChange}
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
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">
                      Respuesta Secreta
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="respuestaSeguridad"
                      value={user.respuestaSeguridad}
                      placeholder="Escriba su nueva respuesta secreta"
                      onChange={this.handleChange}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </fieldset>

            <div className="d-flex gap-2 mt-3">
              <Button style={greenButtonStyle} onClick={this.handleToggleEdit}>
                {disabled ? "Editar datos" : "Cancelar Edición"}
              </Button>
              {!disabled && (
                <Button variant="primary" type="submit">
                  Guardar Cambios
                </Button>
              )}
            </div>
          </Form>
        </div>
      </Container>
    );
  }
}
