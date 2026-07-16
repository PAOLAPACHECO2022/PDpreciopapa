const axios = require("axios");
const { correrBatchDiario } = require("../jobs/predictionJob");
const Prediction = require("../models/Prediction");

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

    // 2. Comunicarse con el microservicio de FastAPI (Puerto 8000)
    // Pasamos TODO el bloque de parámetros que capturamos del agricultor
    const pythonResponse = await axios.get(
      process.env.FASTAPI_URL || "http://localhost:8000/predict",
      {
        params: {
          producto,
          horizonte,
          precio_promedio,
          Cant_Ton_Total,
          costo_total,
          tmedia_c,
          tmedia_c_lag20,
          prec30_mm,
        },
      },
    );
    // 3. Retornar las predicciones del modelo LSTM formateadas al cliente React
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

    // 🆕 Filtro por fecha de predicción (el día que se proyecta el precio,
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
