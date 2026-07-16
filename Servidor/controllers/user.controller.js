const User = require("../models/User");
const jwt = require("jsonwebtoken");

// 1. REGISTRO DE USUARIOS
exports.register = async (req, res) => {
  try {
    const { password, preguntaSeguridad, respuestaSeguridad, ...userData } =
      req.body;
    if (userData._id === "" || userData._id === null) delete userData._id;

    // Normalizamos la respuesta secreta (sin espacios en los extremos y todo en minúsculas)
    const limpiaRespuesta = respuestaSeguridad
      ? respuestaSeguridad.trim().toLowerCase()
      : "";

    const newUser = new User({
      ...userData,
      password,
      preguntaSeguridad,
      respuestaSeguridad: limpiaRespuesta,
      loginAttempts: 0,
      isLocked: false,
    });

    await newUser.save();
    res
      .status(201)
      .json({
        ok: true,
        message: "Usuario registrado con éxito en AgriForecast",
      });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
};

// 2. INICIO DE SESIÓN (MÁXIMO 3 INTENTOS FALLIDOS)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar el usuario por correo electrónico
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ ok: false, message: "Usuario o contraseña incorrectos" });
    }

    // 🛑 VALIDACIÓN 1: Verificar si la cuenta ya se encuentra bloqueada
    if (user.isLocked) {
      return res.status(423).json({
        ok: false,
        message:
          "Su cuenta ha sido bloqueada por exceso de intentos fallidos. Por favor, comuníquese de inmediato con el Administrador del sistema para restaurar su acceso.",
      });
    }

    // Validar contraseña empleando el método del modelo
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      const currentAttempts = (user.loginAttempts || 0) + 1;
      user.loginAttempts = currentAttempts;

      // 🔒 Si alcanza o supera los 3 intentos, ejecutamos el bloqueo definitivo
      if (currentAttempts >= 3) {
        user.isLocked = true;
        await user.save();
        return res.status(423).json({
          ok: false,
          message:
            "Has superado el límite de 3 intentos permitidos. Tu cuenta ha sido bloqueada. Comunícate con el Administrador para desbloquear tu perfil.",
        });
      }

      await user.save();
      const intentosRestantes = 3 - currentAttempts;
      return res.status(401).json({
        ok: false,
        message: `Contraseña incorrecta. Le quedan ${intentosRestantes} ${intentosRestantes === 1 ? "intento" : "intentos"} antes de que la cuenta sea bloqueada.`,
      });
    }

    // 🎉 LOGIN EXITOSO: Restablecemos los intentos a 0
    user.loginAttempts = 0;
    user.isLocked = false;
    await user.save();

    // Generación del token JWT válido por 24 horas
    const token = jwt.sign(
      { id: user._id, email: user.email, cedula: user.cedula },
      "TU_FIRMA_SECRETA_JWT",
      { expiresIn: "24h" },
    );

    res.json({ ok: true, token, user });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

// 3. RECUPERACIÓN - PASO 1: EXTRAER PREGUNTA DE SEGURIDAD POR CÉDULA
exports.getSecurityQuestion = async (req, res) => {
  try {
    const { cedula } = req.body;

    const user = await User.findOne({ cedula });
    if (!user) {
      return res.status(404).json({
        ok: false,
        type: "NOT_FOUND",
        message:
          "La cédula ingresada no se encuentra registrada en el sistema.",
      });
    }

    // Si la cuenta está bloqueada por el login, impedimos que usen este formulario alterno
    if (user.isLocked) {
      return res.status(423).json({
        ok: false,
        message:
          "Esta cuenta está bloqueada por seguridad. Comuníquese con el administrador para restaurar sus credenciales.",
      });
    }

    // Devolvemos únicamente la pregunta asociada al frontend
    return res.json({
      ok: true,
      preguntaSeguridad: user.preguntaSeguridad,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, error: "Error interno al procesar la cédula." });
  }
};

// 4. RECUPERACIÓN - PASO 2: VERIFICAR RESPUESTA Y RESTABLECER CONTRASEÑA
exports.resetPasswordByCedula = async (req, res) => {
  try {
    const { cedula, respuestaSeguridad, newPassword } = req.body;

    const user = await User.findOne({ cedula });
    if (!user) {
      return res
        .status(404)
        .json({ ok: false, message: "Usuario no encontrado." });
    }

    // Validamos que la respuesta coincida limpiando espacios y mayúsculas
    const respuestaCliente = respuestaSeguridad
      ? respuestaSeguridad.trim().toLowerCase()
      : "";
    if (user.respuestaSeguridad !== respuestaCliente) {
      return res.status(401).json({
        ok: false,
        message:
          "La respuesta a la pregunta de seguridad es incorrecta. Verifique sus datos.",
      });
    }

    // Asignamos la nueva contraseña y reiniciamos estados de bloqueo
    user.password = newPassword;
    user.loginAttempts = 0;
    user.isLocked = false;

    await user.save();

    return res.json({
      ok: true,
      message:
        "Contraseña actualizada exitosamente en el sistema. Su cuenta está lista para usarse.",
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        ok: false,
        error: "Error interno del servidor al procesar la solicitud.",
      });
  }
};

// 5. CONSULTA DE USUARIO POR CÉDULA
exports.getUserByCedula = async (req, res) => {
  try {
    const user = await User.findOne({ cedula: req.params.id });
    if (!user) {
      return res
        .status(404)
        .json({ ok: false, message: "Usuario no encontrado" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

// 6. ACTUALIZACIÓN GENERAL DE PERFIL POR CÉDULA
exports.updateUserByCedula = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const user = await User.findOne({ cedula: id });
    if (!user) {
      return res
        .status(404)
        .json({
          ok: false,
          message: "Usuario no encontrado en la base de datos",
        });
    }

    if (updateData.email && updateData.email !== user.email) {
      const emailExists = await User.findOne({ email: updateData.email });
      if (emailExists) {
        return res.status(400).json({
          ok: false,
          message:
            "El nuevo correo electrónico ya está registrado por otro usuario",
        });
      }
    }

    // Si actualizan su respuesta de seguridad desde el perfil, la estandarizamos
    if (updateData.respuestaSeguridad) {
      updateData.respuestaSeguridad = updateData.respuestaSeguridad
        .trim()
        .toLowerCase();
    }

    Object.keys(updateData).forEach((key) => {
      if (key !== "cedula" && key !== "_id") {
        user[key] = updateData[key];
      }
    });

    await user.save();
    return res.json({ ok: true, message: "Usuario actualizado con éxito" });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
};
