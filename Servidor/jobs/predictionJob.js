const cron = require("node-cron");
const axios = require("axios");
const Prediction = require("../models/Prediction"); // ⚠️ ajusta esta ruta si tu archivo se llama distinto

// 📦 Productos y horizontes que se ejecutarán automáticamente en cada corrida del batch.
// Deben coincidir exactamente con los "key" definidos en MODELOS_CONFIG del prediction_service.py
const PRODUCTOS = ["papa_negra", "papa_amarilla_BOGOTA", "papa_amarilla_TUNJA"];
const HORIZONTES = [1, 7, 30];

// 🔌 URL del microservicio de FastAPI. Se puede sobreescribir con variable de entorno.
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000/predict";

/**
 * Ejecuta la inferencia para UN producto/horizonte específico y la guarda en Mongo.
 * Está aislada en su propia función para que un fallo puntual (por ejemplo, si
 * faltan los archivos .keras/.pkl para ese horizonte en particular) no tumbe
 * el resto de las combinaciones del batch.
 */
async function ejecutarYGuardar(producto, horizonte) {
  try {
    const { data } = await axios.get(FASTAPI_URL, {
      params: { producto, horizonte },
      timeout: 30000, // 30s de margen por si el modelo tarda en cargar (primera vez sin cache)
    });

    const doc = new Prediction({
      producto: data.modelo_key,
      fecha_ejecucion: new Date(),
      fecha_prediccion: new Date(data.fecha_prediccion),
      horizonte_dias: data.horizonte_h,
      precio_predicho_COP_kg: data.precio_predicho_COP_kg,
      IC_inferior_95: data.IC_inferior_95,
      IC_superior_95: data.IC_superior_95,
      n_bootstrap_validas: data.n_bootstrap_validas,
    });

    await doc.save();
    console.log(
      `✅ Guardado: ${producto} h=${horizonte} -> ${data.precio_predicho_COP_kg} COP/kg`
    );
  } catch (error) {
    // No relanzamos el error: queremos que las demás combinaciones del batch sigan corriendo
    console.error(
      `❌ Falló ${producto} h=${horizonte}: ${error.response?.data?.detail || error.message}`
    );
  }
}

/**
 * Corre el batch completo: todos los productos x todos los horizontes.
 * Se ejecuta de forma SECUENCIAL (no Promise.all) a propósito, para no
 * saturar el servicio de FastAPI con 9 inferencias LSTM + bootstrap
 * corriendo todas al mismo tiempo.
 */
async function correrBatchDiario() {
  console.log(`\n⏰ Iniciando batch de predicciones - ${new Date().toISOString()}`);

  for (const producto of PRODUCTOS) {
    for (const horizonte of HORIZONTES) {
      await ejecutarYGuardar(producto, horizonte);
    }
  }

  console.log("🏁 Batch de predicciones finalizado.\n");
}

function iniciarJobProgramado() {
  const schedule = process.env.PREDICTION_CRON || "0 3 * * *";

  cron.schedule(schedule, correrBatchDiario, {
    timezone: "America/Bogota",
  });

  console.log(`📅 Job de predicciones programado con cron: "${schedule}"`);
}

module.exports = { iniciarJobProgramado, correrBatchDiario };