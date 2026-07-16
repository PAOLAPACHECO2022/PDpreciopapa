import React, { Component } from "react";
import { Link } from "react-router-dom";
import API from "../axios/axiosConfig";
import { Button, Badge, Modal } from "react-bootstrap";

export default class ProductTableRow extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showConfirmModal: false,
      showErrorModal: false,
      backendErrorMsg: "",
    };
  }

  // 🔔 Abre el flujo de confirmación estilizado
  triggerDeleteConfirm = () => {
    this.setState({ showConfirmModal: true });
  };

  // 🏃‍♂️ Cancela la acción de borrado
  handleCancelDelete = () => {
    this.setState({ showConfirmModal: false });
  };

  // 🚀 Ejecuta la petición real de borrado hacia el Backend
  executeDeleteProduct = () => {
    const { _id } = this.props.obj;
    this.setState({ showConfirmModal: false }); // Cerramos el de confirmación

    API.delete(`/products/delete-product/${_id}`)
      .then(() => {
        this.props.refreshTable();
      })
      .catch((error) => {
        console.error("Error al borrar el producto:", error);
        const errorMsg =
          error.response?.data?.msg ||
          "Asegúrate de tener una sesión activa o los permisos necesarios de propietario.";
        this.setState({
          showErrorModal: true,
          backendErrorMsg: errorMsg,
        });
      });
  };

  handleCloseError = () => {
    this.setState({ showErrorModal: false });
  };

  render() {
    const { fecha, name, descripcion, precio, cantidad, estado, _id, creador } =
      this.props.obj;
    const { usuarioActualId } = this.props;

    const fechaObj = new Date(fecha);
    const fechaFormateada = isNaN(fechaObj)
      ? "Fecha no disponible"
      : fechaObj.toLocaleDateString() +
        " " +
        fechaObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const brandStyles = {
      nameText: { color: "#5e4b3c", fontWeight: "700" },
      priceText: { color: "#4db806", fontWeight: "700" },
      activeBadge: {
        backgroundColor: "#4db806",
        color: "#212529",
        fontWeight: "600",
        padding: "6px 10px",
      },
      inactiveBadge: {
        backgroundColor: "#c62828",
        color: "#ffffff",
        fontWeight: "600",
        padding: "6px 10px",
      },
      editButton: {
        backgroundColor: "#5e4b3c",
        border: "none",
        color: "#ffffff",
        borderRadius: "15px",
        fontWeight: "600",
        fontSize: "0.8rem",
        padding: "4px 12px",
      },
      deleteButton: {
        border: "1px solid #c62828",
        color: "#c62828",
        borderRadius: "15px",
        fontWeight: "600",
        fontSize: "0.8rem",
        padding: "3px 12px",
        backgroundColor: "transparent",
      },
      contactButton: {
        backgroundColor: "#4db806",
        border: "none",
        color: "#212529",
        borderRadius: "15px",
        fontWeight: "700",
        fontSize: "0.8rem",
        padding: "5px 14px",
        boxShadow: "0 2px 5px rgba(77,184,6,0.15)",
      },
      modalHeaderConfirm: {
        background: "#e65100", // Tono cálido de advertencia/atención
        color: "#ffffff",
      },
      modalHeaderError: {
        background: "#c62828",
        color: "#ffffff",
      },
    };

    const isActivo = estado?.toLowerCase() === "activo";
    const esPropietario = String(creador) === String(usuarioActualId);

    return (
      <tr>
        <td className="small text-muted p-3">{fechaFormateada}</td>
        <td style={brandStyles.nameText} className="p-3">
          {name}
        </td>
        <td
          className="text-secondary small p-3"
          style={{
            maxWidth: "220px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {descripcion}
        </td>
        <td className="p-3">
          <span style={brandStyles.priceText}>
            ${new Intl.NumberFormat("es-CO").format(precio || 0)}
          </span>
        </td>
        <td className="fw-semibold text-dark p-3">{cantidad}</td>
        <td className="p-3">
          <Badge
            style={
              isActivo ? brandStyles.activeBadge : brandStyles.inactiveBadge
            }
            className="rounded-pill shadow-sm"
          >
            {(estado || "INACTIVO").toUpperCase()}
          </Badge>
        </td>
        <td className="p-3">
          <div className="d-flex flex-sm-row flex-column gap-2 justify-content-center align-items-center">
            {esPropietario ? (
              <>
                <Link
                  className="btn btn-sm shadow-sm d-inline-flex align-items-center"
                  style={brandStyles.editButton}
                  to={`/edit-product/${_id}`}
                >
                  ✏️ Editar
                </Link>
                <Button
                  onClick={this.triggerDeleteConfirm}
                  size="sm"
                  style={brandStyles.deleteButton}
                  className="shadow-sm d-inline-flex align-items-center"
                >
                  🗑️ Borrar
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  if (!creador) {
                    this.setState({
                      showErrorModal: true,
                      backendErrorMsg:
                        "Este producto es antiguo y no cuenta con un productor asignado asignable.",
                    });
                    return;
                  }
                  this.props.onVerContacto(creador);
                }}
                size="sm"
                style={brandStyles.contactButton}
                className="shadow-sm d-inline-flex align-items-center"
              >
                👨‍🌾 Ver Contacto
              </Button>
            )}
          </div>

          {/* 🟧 MODAL PREMIUM DE CONFIRMACIÓN DE BORRADO */}
          <Modal
            show={this.state.showConfirmModal}
            onHide={this.handleCancelDelete}
            centered
            className="rounded-4 overflow-hidden"
          >
            <Modal.Header
              style={brandStyles.modalHeaderConfirm}
              className="border-0"
            >
              <Modal.Title className="fw-bold fs-5">
                ⚠️ Confirmar Remoción
              </Modal.Title>
            </Modal.Header>
            <Modal.Body
              className="text-center p-4"
              style={{ backgroundColor: "#fdfdfb" }}
            >
              <div className="my-2 display-4 text-warning">🗑️</div>
              <h5 className="fw-bold mb-2" style={{ color: "#5e4b3c" }}>
                ¿Eliminar este lote del inventario?
              </h5>
              <p className="text-muted small mb-0">
                Está a punto de eliminar de forma permanente el registro del
                producto <strong className="text-dark">"{name}"</strong>. Esta
                acción no se puede deshacer.
              </p>
            </Modal.Body>
            <Modal.Footer className="border-0 justify-content-center bg-light gap-2">
              <Button
                variant="outline-secondary"
                onClick={this.handleCancelDelete}
                className="rounded-pill px-3 fw-bold btn-sm"
              >
                Mantener Producto
              </Button>
              <Button
                variant="danger"
                onClick={this.executeDeleteProduct}
                className="rounded-pill px-3 fw-bold btn-sm shadow-sm"
              >
                Sí, Confirmar Borrado
              </Button>
            </Modal.Footer>
          </Modal>

          {/* 🟥 MODAL PREMIUM DE ERROR DE OPERACIÓN */}
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
                ❌ Acción Restringida
              </Modal.Title>
            </Modal.Header>
            <Modal.Body
              className="text-center p-4"
              style={{ backgroundColor: "#fdfdfb" }}
            >
              <div className="my-2 display-4 text-danger">🛑</div>
              <h5 className="fw-bold mb-2" style={{ color: "#5e4b3c" }}>
                No se pudo procesar la solicitud
              </h5>
              <p className="text-muted small mb-0">
                {this.state.backendErrorMsg}
              </p>
            </Modal.Body>
            <Modal.Footer className="border-0 justify-content-center bg-light">
              <Button
                variant="secondary"
                onClick={this.handleCloseError}
                className="rounded-pill px-4 fw-bold btn-sm"
              >
                Entendido
              </Button>
            </Modal.Footer>
          </Modal>
        </td>
      </tr>
    );
  }
}
