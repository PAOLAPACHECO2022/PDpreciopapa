const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let productSchema = new Schema(
  {
    name: { type: String, required: true },
    descripcion: { type: String },
    precio: { type: Number },
    cantidad: { type: Number },
    fecha: { type: Date, default: Date.now },
    estado: {
      type: String,
      enum: ["activo", "inactivo"],
      default: "activo"
    },
    // 🔒 CORRECCIÓN: Tipo numérico para guardar directamente la cédula del agricultor
    creador: { 
      type: Number, 
      required: true 
    }
  },
  { collection: "products" }
);

module.exports = mongoose.model("Product", productSchema);