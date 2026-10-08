import mongoose from 'mongoose';

const cartCollection = 'carts';

// Un carrito por usuario (campo `user` unico). Cada item guarda la
// referencia al producto y la cantidad elegida.
const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'usuarios', required: true, unique: true },
    products: {
        type: [{
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'products', required: true },
            quantity: { type: Number, required: true, min: 1, default: 1 },
        }],
        default: [],
    },
}, { timestamps: true });

const cartModel = mongoose.model(cartCollection, cartSchema);

export default cartModel;
