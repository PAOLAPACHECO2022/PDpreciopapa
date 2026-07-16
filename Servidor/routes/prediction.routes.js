const express = require('express');
const router = express.Router();

// Importamos el controlador correspondiente (asegúrate de que la ruta del archivo sea la correcta)
const predictionController = require('../controllers/prediction.controller');

// 🔮 Ruta para la consulta unitaria o simulación avanzada del agricultor
router.get('/agro-predictions', predictionController.getPrediction);

// 🆕 Ruta histórica para el nuevo dashboard del agricultor (consulta de MongoDB)
router.get('/predictions-history', predictionController.getPredictionsHistory);

router.post("/predictions/run-batch", predictionController.ejecutarBatchManual);
router.get("/prediction-curve", predictionController.getPredictionCurve);

module.exports = router;


