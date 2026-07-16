import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Carousel, Accordion, Row, Col, Card, Image } from "react-bootstrap";

// 🖼️ IMPORTACIÓN DE IMÁGENES
import carru1 from "../components/imagenes/carru1.png";
import carru2 from "../components/imagenes/carru2.png";
import carru3 from "../components/imagenes/carru3.png";
import imagenPapa from "../components/imagenes/Papa.png";
import acorr2 from "../components/imagenes/acorr2.png";
import acorr4 from "../components/imagenes/acorr4.png";

export default class Home extends Component {
  render() {
    // 🎨 Estilo unificado para los botones verdes de AgriForecast
    const greenButtonStyle = {
      background: "#4db806",
      border: "none",
      borderRadius: "30px",
      padding: "12px 24px",
      fontWeight: "bold",
      fontSize: "1.1rem",
      transition: "all 0.3s ease",
    };

    return (
      <>
        {/* === SECCIÓN 1: CARRUSEL INFORMATIVO RESPONSIVO === */}
        <Carousel className="shadow rounded-4 overflow-hidden">
          {/* Diapositiva 1 */}
          <Carousel.Item style={{ maxHeight: "500px" }}>
            <img
              alt="Inteligencia en tus cultivos"
              src={carru1}
              className="d-block w-100 object-fit-cover"
              style={{ minHeight: "300px", objectPosition: "center" }}
            />
            <Carousel.Caption className="px-3" style={{ bottom: "10%" }}>
              <div className="bg-dark bg-opacity-75 rounded-4 p-3 text-white backdrop-blur">
                <h3 className="fw-bold fs-4 mb-2" style={{ color: "#4db806" }}>
                  Predicción de Precios de Papa
                </h3>
                <p className="small mb-0 d-none d-sm-block">
                  Impulsa tus decisiones agrícolas con nuestra plataforma
                  avanzada. Utilizamos inteligencia artificial para predecir las
                  fluctuaciones del precio de la papa en Colombia, ayudándote a
                  maximizar tus ganancias y reducir riesgos.
                </p>
              </div>
            </Carousel.Caption>
          </Carousel.Item>

          {/* Diapositiva 2 */}
          <Carousel.Item style={{ maxHeight: "500px" }}>
            <img
              alt="Innovación tecnológica"
              src={carru2}
              className="d-block w-100 object-fit-cover"
              style={{ minHeight: "300px", objectPosition: "center" }}
            />
            <Carousel.Caption className="px-3" style={{ bottom: "10%" }}>
              <div className="bg-dark bg-opacity-75 rounded-4 p-3 text-white backdrop-blur">
                <h3 className="fw-bold fs-4 mb-2" style={{ color: "#4db806" }}>
                  Tecnología de Vanguardia
                </h3>
                <p className="small mb-0 d-none d-sm-block">
                  Nuestra herramienta analiza años de historial, tendencias
                  climáticas y variables económicas para ofrecerte las
                  predicciones más precisas. Con AgriForecast, cada siembra es
                  una inversión inteligente.
                </p>
              </div>
            </Carousel.Caption>
          </Carousel.Item>

          {/* Diapositiva 3 */}
          <Carousel.Item style={{ maxHeight: "500px" }}>
            <img
              alt="Cosecha de oportunidades"
              src={carru3}
              className="d-block w-100 object-fit-cover"
              style={{ minHeight: "300px", objectPosition: "center" }}
            />
            <Carousel.Caption className="px-3" style={{ bottom: "10%" }}>
              <div className="bg-dark bg-opacity-75 rounded-4 p-3 text-white backdrop-blur">
                <h3 className="fw-bold fs-4 mb-2" style={{ color: "#4db806" }}>
                  Tus Ganancias son Nuestra Prioridad
                </h3>
                <p className="small mb-0 d-none d-sm-block">
                  Únete a nuestra comunidad de agricultores que ya utilizan
                  predicciones inteligentes para optimizar sus ventas y asegurar
                  su sustento. ¡Empieza a sembrar con total confianza hoy mismo!
                </p>
              </div>
            </Carousel.Caption>
          </Carousel.Item>

          {/* Diapositiva 4 */}
          <Carousel.Item style={{ maxHeight: "500px" }}>
            <img
              alt="Cosecha de oportunidades alternativas"
              src={acorr2}
              className="d-block w-100 object-fit-cover"
              style={{ minHeight: "300px", objectPosition: "center" }}
            />
          </Carousel.Item>
        </Carousel>

        {/* === SECCIÓN 2: PANEL DE ACCIÓN Y CONTROL DEL AGRICULTOR === */}
        <div className="mt-5 p-4 p-md-5 bg-white rounded-4 shadow-sm border text-center">
          {/* === SECCIÓN 3: ACORDEÓN TÉCNICO INFORMATIVO === */}
          <Accordion
            defaultActiveKey="0"
            className="mt-4 text-start shadow-sm rounded-3 overflow-hidden"
          >
            {/* Tarjeta de Información General */}
            <Accordion.Item eventKey="0" className="border-bottom">
              <Accordion.Header className="fw-bold">
                <div className="d-flex align-items-center">
                  <Image
                    src={imagenPapa}
                    width="24"
                    height="24"
                    className="me-2 rounded-circle"
                  />
                  <span
                    className="fw-bold"
                    style={{ color: "#4db806", fontSize: "0.95rem" }}
                  >
                    INFORMACIÓN GENERAL DE PAPAS
                  </span>
                </div>
              </Accordion.Header>
              <Accordion.Body className="bg-light p-4">
                <Row className="align-items-center g-4">
                  <Col xs={12} md={4} className="text-center">
                    <Card.Img
                      variant="top"
                      src={acorr4}
                      className="rounded shadow-sm img-fluid"
                      style={{ maxHeight: "180px", objectFit: "cover" }}
                    />
                  </Col>
                  <Col xs={12} md={8}>
                    <p className="text-dark fw-bold mb-2 fs-5">
                      Guía Esencial para el Productor de Papa
                    </p>
                    <p
                      className="text-muted mb-0"
                      style={{ textAlign: "justify", lineHeight: "1.6" }}
                    >
                      La papa es un pilar de la seguridad alimentaria en
                      Colombia. Aquí encontrará información nutricional clave,
                      variedades comunes en la región andina y los principios
                      básicos para una cosecha exitosa. Conocer su producto es
                      el primer paso para mejorar notablemente su rentabilidad
                      en el mercado nacional.
                    </p>
                  </Col>
                </Row>
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="1">
              <Accordion.Header className="fw-bold">
                <div className="d-flex align-items-center">
                  <Image
                    src={imagenPapa}
                    width="24"
                    height="24"
                    className="me-2 rounded-circle"
                  />
                  <span
                    className="fw-bold"
                    style={{ color: "#4db806", fontSize: "0.95rem" }}
                  >
                    GUÍA TÉCNICA Y ECONÓMICA DE MANEJO
                  </span>
                </div>
              </Accordion.Header>
              <Accordion.Body className="bg-light p-4">
                <Row className="align-items-center g-4 mb-4">
                  {/* Imagen lateral */}
                  <Col xs={12} md={4} className="order-md-2 text-center">
                    <Card.Img
                      variant="top"
                      src={acorr2}
                      className="rounded shadow-sm img-fluid"
                      style={{ maxHeight: "220px", objectFit: "cover" }}
                    />
                  </Col>

                  {/* Introducción */}
                  <Col xs={12} md={8} className="order-md-1">
                    <p className="text-dark fw-bold mb-3 fs-4 border-bottom pb-2">
                      🌱 Mejores Prácticas y Manejo Integral del Cultivo
                    </p>
                    <p
                      className="text-muted mb-0"
                      style={{ textAlign: "justify", lineHeight: "1.6" }}
                    >
                      El éxito y la rentabilidad de la producción de papa
                      dependen de un equilibrio técnico entre la tradición del
                      campo y la innovación agronómica. Implementar un manejo
                      integral no solo asegura una cosecha abundante, sino que
                      también maximiza su valor comercial frente a las
                      constantes fluctuaciones del mercado.
                    </p>
                  </Col>
                </Row>

                {/* Rejilla de tarjetas técnicas y de precios */}
                <Row className="g-3 text-start">
                  {/* 💰 TARJETA NUEVA: Precio y Mercado */}
                  <Col xs={12} sm={6}>
                    <div
                      className="p-3 bg-white rounded-3 shadow-sm border-start border-warning border-4 h-100"
                      style={{ backgroundColor: "#fffdf6" }}
                    >
                      <h6 className="fw-bold text-dark mb-2">
                        💰 Dinámica de Precios y Mercado
                      </h6>
                      <p className="small text-muted mb-0">
                        El precio de la papa en Colombia es altamente volátil
                        debido a la estacionalidad de las cosechas y factores
                        climáticos. Usar herramientas predictivas te permite
                        identificar los mejores momentos de oferta para negociar
                        precios justos y evitar pérdidas por intermediación.
                      </p>
                    </div>
                  </Col>

                  {/* Tarjeta: Semilla Certificada */}
                  <Col xs={12} sm={6}>
                    <div className="p-3 bg-white rounded-3 shadow-sm border-start border-success border-4 h-100">
                      <h6 className="fw-bold text-success mb-2">
                        🏅 Semilla Certificada
                      </h6>
                      <p className="small text-muted mb-0">
                        El punto de partida ideal. Garantiza la pureza varietal,
                        un alto potencial de rendimiento y la ausencia de
                        patógenos críticos que puedan comprometer la calidad del
                        tubérculo en el suelo.
                      </p>
                    </div>
                  </Col>

                  {/* Tarjeta: Manejo Fitosanitario */}
                  <Col xs={12} sm={6}>
                    <div className="p-3 bg-white rounded-3 shadow-sm border-start border-success border-4 h-100">
                      <h6 className="fw-bold text-success mb-2">
                        🐛 Manejo Fitosanitario (MIP)
                      </h6>
                      <p className="small text-muted mb-0">
                        Monitoreo constante para el control preventivo de plagas
                        (como la polilla) y enfermedades comunes (como la gota),
                        priorizando soluciones biológicas antes de recurrir a
                        agroquímicos fuertes.
                      </p>
                    </div>
                  </Col>

                  {/* Tarjeta: Nutrición y Riego */}
                  <Col xs={12} sm={6}>
                    <div className="p-3 bg-white rounded-3 shadow-sm border-start border-success border-4 h-100">
                      <h6 className="fw-bold text-success mb-2">
                        💧 Nutrición y Riego Eficiente
                      </h6>
                      <p className="small text-muted mb-0">
                        Optimización responsable del agua mediante sistemas
                        técnicos y planes de fertilización basados en análisis
                        de suelo previos, evitando sobrecargar la tierra o lavar
                        nutrientes valiosos.
                      </p>
                    </div>
                  </Col>

                  {/* Tarjeta: Sostenibilidad */}
                  <Col xs={12} sm={6}>
                    <div className="p-3 bg-white rounded-3 shadow-sm border-start border-success border-4 h-100">
                      <h6 className="fw-bold text-success mb-2">
                        🌍 Sostenibilidad Ambiental
                      </h6>
                      <p className="small text-muted mb-0">
                        Prácticas de conservación como la rotación de cultivos y
                        labranza mínima. Esto disminuye drásticamente la erosión
                        andina para asegurar tierras altamente productivas a
                        futuras generaciones.
                      </p>
                    </div>
                  </Col>
                </Row>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
          <h3
            className="h5 text-dark mb-4 text-uppercase fw-bold tracking-wide my-5"
            style={{ color: "#5e4b3c" }}
          >
            🌾 Señor Usuario, gestione sus cultivos de papa aquí
          </h3>

          {/* El d-grid se adapta elegantemente de 1 columna en móvil a anchos medidos en pantallas de escritorio */}
          <div className="d-grid gap-3 col-12 col-md-8 mx-auto mb-5">
            <Link
              to="/create-product"
              className="btn btn-lg shadow-sm text-dark custom-btn-hover"
              style={greenButtonStyle}
            >
              Registrar Nuevo Cultivo de Papa
            </Link>
            <Link
              to="/product-list"
              className="btn btn-lg shadow-sm text-dark custom-btn-hover"
              style={greenButtonStyle}
            >
              Ver Mis Cultivos Registrados
            </Link>
          </div>
        </div>
      </>
    );
  }
}
