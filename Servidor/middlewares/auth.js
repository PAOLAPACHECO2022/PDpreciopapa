const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Extrae el token tras la palabra 'Bearer'

  // 1. Validación inmediata: Si no hay token, rechazamos de una vez
  if (!token) {
    return res
      .status(401)
      .json({ ok: false, message: "Acceso denegado. Token no provisto." });
  }

  // 2. Bloque seguro para verificar el JWT
  try {
    // Usamos la firma exacta con la que generas tus tokens en el controlador de usuarios
    const decoded = jwt.verify(token, "TU_FIRMA_SECRETA_JWT");

    // Inyectamos los datos decodificados en la petición (aquí van 'id', 'email' y 'cedula' si viene en el payload)
    req.user = decoded;

    next(); // Damos paso al controlador de productos
  } catch (error) {
    return res
      .status(403)
      .json({ ok: false, message: "Token inválido o expirado." });
  }
};
