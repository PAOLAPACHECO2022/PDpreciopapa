const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");

router.post("/register", userController.register);
router.post("/login", userController.login);

// 🔒 RUTAS DE RECUPERACIÓN (Fijas - van arriba)
router.post("/get-question", userController.getSecurityQuestion); // Nuevo paso 1
router.post("/reset-password", userController.resetPasswordByCedula); // Paso 2

router.put("/update/:id", userController.updateUserByCedula);
router.get("/:id", userController.getUserByCedula);

module.exports = router;
