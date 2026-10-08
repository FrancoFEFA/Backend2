import productModel from '../models/product.model.js';

// DAO: operaciones crudas de Mongoose sobre la coleccion de productos.
// No valida reglas de negocio (eso es responsabilidad del repository).
const productDao = {
    findAll(filter = {}) {
        return productModel.find(filter);
    },

    findById(id) {
        return productModel.findById(id);
    },

    findByCode(code) {
        return productModel.findOne({ code });
    },

    create(data) {
        return productModel.create(data);
    },

    updateById(id, changes) {
        return productModel.findByIdAndUpdate(id, changes, { new: true, runValidators: true });
    },

    deleteById(id) {
        return productModel.findByIdAndDelete(id);
    },

    // Delta positivo suma stock, negativo lo descuenta.
    incrementStock(id, delta) {
        return productModel.findByIdAndUpdate(id, { $inc: { stock: delta } }, { new: true });
    },
};

export default productDao;
