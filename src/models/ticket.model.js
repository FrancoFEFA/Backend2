import mongoose from 'mongoose';
import crypto from 'node:crypto';

const ticketCollection = 'tickets';

// Snapshot de una compra ya confirmada: precios y titulos quedan
// congelados en el momento de la compra, independientes de cambios
// futuros en el catalogo.
const ticketSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, default: () => crypto.randomUUID() },
    purchase_datetime: { type: Date, default: Date.now },
    amount: { type: Number, required: true, min: 0 },
    purchaser: { type: String, required: true }, // email del usuario que compro
    products: {
        type: [{
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'products' },
            title: String,
            price: Number,
            quantity: Number,
        }],
        default: [],
    },
});

const ticketModel = mongoose.model(ticketCollection, ticketSchema);

export default ticketModel;
