import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

// Navegación
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link,
  Redirect,
} from "react-router-dom";

// UI Bootstrap
import { Navbar, Container, Dropdown, Nav } from "react-bootstrap";

// Componentes del Proyecto
import CreateProduct from "./components/CreateProduct";
import EditProduct from "./components/EditProduct";
import ProductList from "./components/ProductList";
import ProductDashboard from "./components/ProductDashboard";
import ForgotPassword from "./components/ForgotPassword";
import PredictionHistoryDashboard from "./components/PredictionHistoryDashboard";
import Home from "./components/Home";
import Login from "./components/login/LoginForm.component";
import Register from "./components/login/register/RegisterForm.component";
import Profile from "./components/myperfil.component";

import imagenPapa from "../src/components/imagenes/Papa.png";
import logo from "../src/components/imagenes/papasinn.jpg";

function App() {
  const [isAuth, setIsAuth] = useState(localStorage.getItem("token") !== null);

  useEffect(() => {
    const verificarToken = () => {
      const tokenExiste = localStorage.getItem("token") !== null;
      if (tokenExiste !== isAuth) {
        setIsAuth(tokenExiste);
      }
    };

    window.addEventListener("storage", verificarToken);
    const intervalo = setInterval(verificarToken, 500);

    return () => {
      window.removeEventListener("storage", verificarToken);
      clearInterval(intervalo);
    };
  }, [isAuth]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("cedula");
    setIsAuth(false);
    window.location.replace("/");
  };

  // Guard de Seguridad para Rutas Privadas
  const PrivateRoute = ({ component: Component, ...rest }) => (
    <Route
      {...rest}
      render={(props) =>
        isAuth ? <Component {...props} /> : <Redirect to="/" />
      }
    />
  );

  // Paleta de Estilos de AgriForecast para una apariencia Premium
  const headerStyles = {
    navbar: {
      backgroundColor: "#ffffff",
      borderBottom: "1px solid #e2e8f0",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
    },
    brandText: {
      color: "#5e4b3c",
      fontWeight: "700",
      fontSize: "1.25rem",
    },
    brandSubtext: {
      color: "#4db806",
      fontSize: "0.85rem",
      fontWeight: "600",
      letterSpacing: "1px",
    },
    navLink: {
      color: "#5e4b3c",
      fontWeight: "600",
      fontSize: "0.95rem",
      transition: "all 0.2s ease",
    },
    greenButton: {
      backgroundColor: "#4db806",
      borderColor: "#4db806",
      color: "#ffffff",
      fontWeight: "600",
    },
    outlineButton: {
      color: "#5e4b3c",
      borderColor: "#cbd5e1",
      fontWeight: "600",
    },
  };

  return (
    <Router>
      <div
        className={`App d-flex flex-column min-vh-100 ${isAuth ? "bg-light" : "bg-auth-image"}`}
      >
        {/* --- NAVBAR O HEADER ELEGANTE --- */}
        <Navbar
          expand="lg"
          style={headerStyles.navbar}
          className="py-2 sticky-top"
        >
          <Container>
            {/* Logo y Nombre de Marca */}
            <Navbar.Brand>
              <Link
                to={isAuth ? "/home" : "/"}
                className="text-decoration-none d-flex align-items-center"
              >
                <img
                  alt="AgriForecast Logo"
                  src={logo}
                  width="70"
                  height="60"
                  className="me-1 "
                />
                <div className="d-flex flex-column text-start">
                  <span style={headerStyles.brandText}>AgriForecast</span>
                  <span
                    style={headerStyles.brandSubtext}
                    className="text-uppercase"
                  >
                    Papa
                  </span>
                </div>
              </Link>
            </Navbar.Brand>

            {/* Hamburguesa para Móviles */}
            <Navbar.Toggle
              aria-controls="agriforecast-navbar-nav"
              className="border-0"
            />

            <Navbar.Collapse id="agriforecast-navbar-nav">
              {/* Menú de Gestión Central/Derecho (Solo visible con sesión activa) */}
              <Nav className="ms-auto align-items-center gap-2 my-2 my-lg-0">
                {isAuth && (
                  <>
                    <Nav.Link
                      as={Link}
                      to="/home"
                      style={headerStyles.navLink}
                      className="px-3 py-2 rounded-pill hover-effect"
                    >
                      Home
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/product-list"
                      style={headerStyles.navLink}
                      className="px-3 py-2 rounded-pill hover-effect"
                    >
                      Inventario
                    </Nav.Link>
                    {/* 🆕 ACCESO AL NUEVO DASHBOARD HISTÓRICO DE MONGODB */}
                    <Nav.Link
                      as={Link}
                      to="/prediction-history"
                      style={headerStyles.navLink}
                      className="px-3 py-2 rounded-pill hover-effect"
                    >
                      Historial
                    </Nav.Link>
                    <Nav.Link
                      as={Link}
                      to="/dashboard"
                      style={headerStyles.greenButton}
                      className="btn btn-sm rounded-pill px-4 text-white shadow-sm me-lg-3"
                    >
                      Gráficos
                    </Nav.Link>
                  </>
                )}

                {/* Botones de Acceso Directo / Dropdown de Usuario */}
                {!isAuth ? (
                  <div className="d-flex gap-2">
                    <Link
                      to="/"
                      className="btn btn-sm rounded-pill px-4"
                      style={headerStyles.outlineButton}
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      className="btn btn-sm rounded-pill px-4 shadow-sm"
                      style={headerStyles.greenButton}
                    >
                      Registro
                    </Link>
                  </div>
                ) : (
                  <Dropdown align="end">
                    <Dropdown.Toggle
                      as="div"
                      className="btn-profile"
                      style={{ cursor: "pointer" }}
                    >
                      <img
                        alt="User Avatar"
                        src={imagenPapa}
                        width="50"
                        height="50"
                        className="rounded-circle border border-2 shadow-sm"
                        style={{ borderColor: "#4db806" }}
                      />
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="shadow border-0 mt-2 dropdown-menu-end rounded-3">
                      <div className="px-3 py-2 text-muted small border-bottom mb-1 fw-bold text-uppercase">
                        Opciones
                      </div>
                      <Dropdown.Item as={Link} to="/profile" className="py-2">
                        <i className="bi bi-person me-2"></i>Mi Perfil
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      <Dropdown.Item
                        onClick={handleLogout}
                        className="text-danger fw-bold py-2"
                      >
                        <i className="bi bi-box-arrow-right me-2"></i>Cerrar
                        Sesión
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                )}
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        {/* --- CONTENEDOR PRINCIPAL DE RUTAS --- */}
        <Container className="mt-5 pb-5 flex-grow-1">
          <Switch>
            {/* 🔄 Rutas Públicas */}
            <Route
              exact
              path="/"
              render={(props) =>
                isAuth ? <Redirect to="/home" /> : <Login {...props} />
              }
            />
            <Route
              path="/signup"
              render={(props) =>
                isAuth ? <Redirect to="/home" /> : <Register {...props} />
              }
            />
            <Route
              path="/forgot-password"
              render={(props) =>
                isAuth ? <Redirect to="/home" /> : <ForgotPassword {...props} />
              }
            />

            {/* Rutas Protegidas mediante PrivateRoute */}
            <PrivateRoute path="/home" component={Home} />
            <PrivateRoute path="/profile" component={Profile} />
            <PrivateRoute path="/create-product" component={CreateProduct} />
            <PrivateRoute path="/edit-product/:id" component={EditProduct} />
            <PrivateRoute path="/product-list" component={ProductList} />
            <PrivateRoute path="/dashboard" component={ProductDashboard} />

            {/* 🆕 RUTA ASOCIADA AL HISTORIAL DE CONSULTAS Y SIMULACIONES EN MONGODB */}
            <PrivateRoute
              path="/prediction-history"
              component={PredictionHistoryDashboard}
            />

            {/* Redirección preventiva ante rutas inexistentes */}
            <Redirect to={isAuth ? "/home" : "/"} />
          </Switch>
        </Container>

        {/* --- FOOTER COHERENTE --- */}
        <footer
          className="bg-white text-muted py-4 mt-auto border-top text-center"
          style={{ fontSize: "0.9rem" }}
        >
          <Container>
            <p className="mb-0 fw-medium">
              &copy; 2026{" "}
              <span style={{ color: "#4db806", fontWeight: "bold" }}>
                AgriForecast
              </span>{" "}
              - Sistema de Gestión de Precios de la Papa. Todos los derechos
              reservados.
            </p>
          </Container>
        </footer>
      </div>
    </Router>
  );
}

export default App;
