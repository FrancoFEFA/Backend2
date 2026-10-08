import cartModel from '../models/cart.model.js';

// DAO: operaciones crudas de Mongoose sobre la coleccion de carritos.
const cartDao = {
    findByUser(userId) {
        return cartModel.findOne({ user: userId });
    },

    findPopulatedByUser(userId) {
        return cartModel.findOne({ user: userId }).populate('products.product');
    },

    create(userId) {
        return cartModel.create({ user: userId, products: [] });
    },

    save(cartDocument) {
        return cartDocument.save();
    },
};

export default cartDao;
