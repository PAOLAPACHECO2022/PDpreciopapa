const Product = require("../models/Product");

// Obtener todos los productos
exports.getAllProducts = async (req, res, next) => {
  try {
    const data = await Product.find();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

// Obtener producto por ID (para editar)
exports.getProductById = async (req, res, next) => {
  try {
    const data = await Product.findById(req.params.id);
    if (!data) return res.status(404).json({ msg: "Producto no encontrado" });
    res.json(data);
  } catch (error) {
    next(error);
  }
};


// En controllers/productController.js
exports.createProduct = async (req, res, next) => {
  try {
    console.log("Datos del usuario en el token:", req.user);

    const productData = {
      ...req.body,
      // 🎯 Forzamos que se use la cédula numérica limpia del token decodificado
      creador: Number(req.user.cedula),
    };

    const data = await Product.create(productData);
    res.status(201).json(data);
  } catch (error) {
    console.error("Error detallado al guardar:", error);
    next(error);
  }
};
// Actualizar producto (Validando que sea el dueño por Cédula)
exports.updateProduct = async (req, res, next) => {
  try {
    const producto = await Product.findById(req.params.id);
    if (!producto) return res.status(404).json({ msg: "No encontrado" });

    // 🛡️ CORRECCIÓN: Comparamos la cédula del producto con la cédula del token
    if (Number(producto.creador) !== Number(req.user.cedula)) {
      return res
        .status(403)
        .json({ msg: "No tienes permisos para modificar este producto." });
    }

    const data = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
};

// Eliminar producto (Validando que sea el dueño por Cédula)
exports.deleteProduct = async (req, res, next) => {
  try {
    const producto = await Product.findById(req.params.id);
    if (!producto) return res.status(404).json({ msg: "No encontrado" });

    // 🛡️ CORRECCIÓN: Comparamos la cédula del producto con la cédula del token
    if (Number(producto.creador) !== Number(req.user.cedula)) {
      return res
        .status(403)
        .json({ msg: "No tienes permisos para eliminar este producto." });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ msg: "Eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};