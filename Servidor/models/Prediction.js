const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PredictionSchema = new Schema({
  producto: { type: String, required: true },
  fecha_ejecucion: { type: Date, required: true },
  fecha_prediccion: { type: Date, required: true },
  horizonte_dias: { type: Number, required: true },
  precio_predicho_COP_kg: { type: Number, required: true },
  IC_inferior_95: { type: Number, required: true },
  IC_superior_95: { type: Number, required: true },
  n_bootstrap_validas: { type: Number },
  precio_base_origen: { type: Number }
}, { 
  collection: "predictions_history" 
});

module.exports = mongoose.model("Prediction", PredictionSchema);