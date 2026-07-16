const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const uniqueValidator = require("mongoose-unique-validator");
const bcrypt = require("bcrypt");

let UserSchema = new Schema({
  nombres: { type: String, required: true },
  apellidos: { type: String, required: true },
  cedula: { type: Number, required: true, unique: true },
  celular: { type: Number, required: true },
  telfijo: { type: Number },
  direccion: { type: String },
  departamento: { type: String, required: true },
  municipio: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // 🔒 NUEVOS CAMPOS PARA EL MÉTODO DE RECUPERACIÓN SEGURO
  preguntaSeguridad: { type: String, required: true },
  respuestaSeguridad: { type: String, required: true },

  // 🚫 NUEVOS CAMPOS PARA CONTROL DE INTENTOS Y BLOQUEO DE CUENTA
  loginAttempts: { type: Number, default: 0 },
  isLocked: { type: Boolean, default: false }
}, { 
  collection: "users",
  timestamps: true 
});

// Middleware para encriptar antes de guardar
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Eliminar campos sensibles de la respuesta JSON por seguridad
UserSchema.methods.toJSON = function () {
  let user = this;
  let userObject = user.toObject();
  delete userObject.password;
  delete userObject.respuestaSeguridad; // Removido también para que nunca viaje al frontend de forma expuesta
  return userObject;
};

UserSchema.plugin(uniqueValidator, { message: "Error: El {PATH} ya se encuentra registrado." });
module.exports = mongoose.model("User", UserSchema);