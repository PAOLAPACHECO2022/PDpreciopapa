const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const auth = require("../middlewares/auth");

// Rutas públicas
router.get("/", productController.getAllProducts);
router.get("/edit-product/:id", productController.getProductById);

// 🔒 Rutas protegidas mediante JWT
router.post("/create-product", auth, productController.createProduct);
router.put("/update-product/:id", auth, productController.updateProduct);
router.delete("/delete-product/:id", auth, productController.deleteProduct);

module.exports = router;
