import mongoose from 'mongoose';

const productCollection = 'products';

// Esquema de productos del catalogo. Solo el admin puede crear/editar/
// borrar (lo garantiza el middleware isAdmin sobre las rutas, no el modelo).
const productSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    category: { type: String, required: true, trim: true },
    status: { type: Boolean, default: true },
    thumbnails: { type: [String], default: [] },
}, { timestamps: true });

const productModel = mongoose.model(productCollection, productSchema);

export default productModel;
