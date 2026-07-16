require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

// 📁 IMPORTANTE: Importamos el archivo que contiene tu mongoURI de la nube.
// Asegúrate de que la ruta relativa hacia tu carpeta de base de datos sea la correcta.
const keys = require("./database/db");

const userRoute = require("./routes/user.route");
const productRoute = require("./routes/product.route");
const predictionRoute = require("./routes/prediction.routes");

// ⏰ Job programado que ejecuta las predicciones automáticamente (ver jobs/predictionJob.js)
const { iniciarJobProgramado } = require("./jobs/predictionJob");

const app = express();

// 🛠️ Middlewares de parsing y seguridad
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// 📍 Rutas de la API
app.use("/users", userRoute);
app.use("/products", productRoute);
app.use("/api", predictionRoute);

// ☁️ CONEXIÓN A LA NUBE: Reemplazamos la IP local por la URI del archivo de configuración
const db = keys.mongoURI;

mongoose
  .connect(db)
  .then(() => {
    console.log("✅ ¡FANTÁSTICO! MongoDB Atlas (Nube) conectado exitosamente");

    // 👇 Solo arrancamos el cron interno si NO estamos en Render (donde usamos
    // un Render Cron Job externo para disparar el batch, más confiable
    // porque no depende de que este Web Service esté despierto).
    // Localmente, con USE_INTERNAL_CRON=true en tu .env, sigue funcionando
    // exactamente igual que antes.
    if (process.env.USE_INTERNAL_CRON === "true") {
      iniciarJobProgramado();
    } else {
      console.log("⏸️  Cron interno desactivado (USE_INTERNAL_CRON no está en 'true'). Se espera disparo externo (Render Cron Job).");
    }
  })
  .catch((err) => {
    console.log("❌ Error de conexión con MongoDB Atlas:");
    console.error(err);
  });

// 🚀 Inicialización del servidor
// En Render, la variable PORT la inyecta la plataforma automáticamente
// (no puedes elegir el puerto tú). En tu máquina local, si no existe esa
// variable de entorno, cae al 4000 como antes.
const PORT = process.env.PORT || 4000;

app.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`)
);

// 🛡️ Manejador de errores global
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    ok: false,
    error: err.message || "Error interno del servidor",
  });
});