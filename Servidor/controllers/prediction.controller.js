const axios = require("axios");
const { correrBatchDiario } = require("../jobs/predictionJob");
const Prediction = require("../models/Prediction");

const HORIZONTES_DISPONIBLES = {
  papa_negra: [1, 7, 30],
  papa_amarilla_BOGOTA: [1],
  papa_amarilla_TUNJA: [1],
};

function horizonteHabilitado(producto, horizonte) {
  const habilitados = HORIZONTES_DISPONIBLES[producto];
  if (!habilitados) return false; // producto no reconocido
  return habilitados.includes(Number(horizonte));
}

// Controlador para gestionar las consultas al modelo predictivo con variables exógenas
exports.getPrediction = async (req, res) => {
  try {
    // 1. Extraemos tanto los parámetros base como las nuevas variables exógenas que envía React
    const {
      producto,
      horizonte,
      precio_promedio,
      Cant_Ton_Total,
      costo_total,
      tmedia_c,
      tmedia_c_lag20,
      prec30_mm,
    } = req.query;

    if (!producto || !horizonte) {
      return res.status(400).json({
        message: "Faltan parámetros requeridos: producto y horizonte.",
      });
    }

    // 🆕 2. Validar que la combinación producto + horizonte esté habilitada
    // (mismo criterio que el frontend, pero exigido también en el backend).
    if (!HORIZONTES_DISPONIBLES[producto]) {
      return res.status(400).json({
        message: `Producto no reconocido: '${producto}'.`,
      });
    }

    if (!horizonteHabilitado(producto, horizonte)) {
      return res.status(400).json({
        message:
          `El horizonte h=${horizonte} no está habilitado para '${producto}' ` +
          `por desempeño insuficiente del modelo (R² negativo en validación). ` +
          `Horizontes disponibles para este producto: ${HORIZONTES_DISPONIBLES[producto].join(", ")}.`,
      });
    }

    // 3. Comunicarse con el microservicio de FastAPI (Puerto 8000)
    // Pasamos TODO el bloque de parámetros que capturamos del agricultor
    // Asegurar que use la URL correcta concatenada
    const pythonResponse = await axios.get(
      `${process.env.FASTAPI_URL || "http://localhost:8000"}/predict`,
      {
        params: {
          producto,
          horizonte,
          precio_promedio: precio_promedio
            ? Number(precio_promedio)
            : undefined,
          Cant_Ton_Total: Cant_Ton_Total ? Number(Cant_Ton_Total) : undefined,
          costo_total: costo_total ? Number(costo_total) : undefined,
          tmedia_c: tmedia_c ? Number(tmedia_c) : undefined,
          tmedia_c_lag20: tmedia_c_lag20 ? Number(tmedia_c_lag20) : undefined,
          prec30_mm: prec30_mm ? Number(prec30_mm) : undefined,
        },
      },
    );
    // 4. Retornar las predicciones del modelo LSTM formateadas al cliente React
    return res.status(200).json(pythonResponse.data);
  } catch (error) {
    console.error(
      "Error conectando con el servicio de predicción Python:",
      error.message,
    );
    return res.status(500).json({
      message:
        "Error al procesar la predicción de precios agrícolas mediante la red LSTM.",
      error: error.message,
    });
  }
};

// Historial de predicciones generadas automáticamente por el job (1, 7 y 30 días)
exports.getPredictionsHistory = async (req, res) => {
  try {
    const { producto, horizonte, limite, fechaPrediccion } = req.query;

    let query = {};

    if (producto) {
      query.producto = producto;
    }

    if (horizonte) {
      query.horizonte_dias = Number(horizonte);
    }

    // Filtro por fecha de predicción (el día que se proyecta el precio,
    // no el día en que se ejecutó el job). El input type="date" del front
    // manda un string "YYYY-MM-DD", así que armamos un rango de ese día
    // completo (00:00:00 a 23:59:59) para no depender de la hora exacta
    // guardada en fecha_prediccion.
    if (fechaPrediccion) {
      const inicioDia = new Date(`${fechaPrediccion}T00:00:00.000Z`);
      const finDia = new Date(`${fechaPrediccion}T23:59:59.999Z`);

      if (!isNaN(inicioDia.getTime())) {
        query.fecha_prediccion = { $gte: inicioDia, $lte: finDia };
      }
    }

    const historico = await Prediction.find(query)
      .sort({ fecha_ejecucion: -1 })
      .limit(Number(limite) || 50);

    return res.status(200).json({
      status: "success",
      results: historico.length,
      data: historico,
    });
  } catch (error) {
    console.error(
      "Error obteniendo el histórico de predicciones:",
      error.message,
    );
    return res.status(500).json({
      message:
        "Error al recuperar el historial de predicciones de la base de datos.",
      error: error.message,
    });
  }
};

exports.ejecutarBatchManual = async (req, res) => {
  try {
    // No usamos await aquí si quieres respuesta inmediata mientras corre en bg,
    // pero para debugging es mejor esperar y ver el resultado real:
    await correrBatchDiario();
    return res
      .status(200)
      .json({ message: "Batch de predicciones ejecutado." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error ejecutando el batch.", error: error.message });
  }
};

exports.getPredictionCurve = async (req, res) => {
  try {
    const {
      producto,
      dias,
      precio_promedio,
      Cant_Ton_Total,
      costo_total,
      tmedia_c,
      tmedia_c_lag20,
      prec30_mm,
    } = req.query;

    if (!producto) {
      return res.status(400).json({ message: "Falta el parámetro requerido: producto." });
    }

    // 🆕 Igual que en getPrediction: validar que el producto exista en el
    // mapa de horizontes habilitados. La curva diaria en sí siempre parte
    // de h=1 (que está habilitado para los tres productos), así que aquí
    // solo validamos que el producto sea reconocido, no un horizonte
    // puntual. Ver nota importante más abajo sobre las anclas h=7/h=30.
    if (!HORIZONTES_DISPONIBLES[producto]) {
      return res.status(400).json({
        message: `Producto no reconocido: '${producto}'.`,
      });
    }

    const baseUrl = `${process.env.FASTAPI_URL || "http://localhost:8000"}/predict/curve`;    

    const pythonResponse = await axios.get(baseUrl, {
      params: {
        producto,
        dias,
        precio_promedio,
        Cant_Ton_Total,
        costo_total,
        tmedia_c,
        tmedia_c_lag20,
        prec30_mm,
      },
      timeout: 60000, // la recursión de 30 pasos tarda más que una predicción simple
    });

    return res.status(200).json(pythonResponse.data);
  } catch (error) {
    console.error("Error obteniendo la curva diaria de predicción:", error.message);
    return res.status(500).json({
      message: "Error al generar la curva diaria de precios.",
      error: error.response?.data?.detail || error.message,
    });
  }
};
