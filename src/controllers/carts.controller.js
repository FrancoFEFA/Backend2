import cartRepository from '../repositories/cart.repository.js';

// Todas las acciones usan req.user._id: el carrito es siempre el del
// usuario autenticado (nunca se opera sobre el carrito de otra persona).
// El router ya garantiza con isUser que solo rol "user" llega hasta aca.
const cartsController = {
    async getMine(req, res, next) {
        try {
            const cart = await cartRepository.getMine(req.user._id);
            res.json({ status: 'success', payload: cart });
        } catch (error) {
            next(error);
        }
    },

    async addProduct(req, res, next) {
        try {
            const quantity = Number(req.body?.quantity) || 1;
            const cart = await cartRepository.addProduct(req.user._id, req.params.pid, quantity);
            res.status(201).json({ status: 'success', payload: cart });
        } catch (error) {
            next(error);
        }
    },

    async updateProduct(req, res, next) {
        try {
            const quantity = Number(req.body?.quantity);
            const cart = await cartRepository.updateQuantity(req.user._id, req.params.pid, quantity);
            res.json({ status: 'success', payload: cart });
        } catch (error) {
            next(error);
        }
    },

    async removeProduct(req, res, next) {
        try {
            const cart = await cartRepository.removeProduct(req.user._id, req.params.pid);
            res.json({ status: 'success', payload: cart });
        } catch (error) {
            next(error);
        }
    },

    async clear(req, res, next) {
        try {
            await cartRepository.clear(req.user._id);
            res.json({ status: 'success', message: 'Carrito vaciado' });
        } catch (error) {
            next(error);
        }
    },

    // Checkout: confirma la compra de todo lo que tenga stock disponible
    // en este momento. Si algun producto se quedo sin stock entre que se
    // agrego al carrito y se compro, queda pendiente en el carrito y se
    // informa en la respuesta (compra parcial).
    async purchase(req, res, next) {
        try {
            const result = await cartRepository.purchase(req.user._id, req.user.email);

            if (!result.ticket) {
                return res.status(400).json({
                    status: 'error',
                    message: 'No se pudo completar la compra: ningun producto del carrito tiene stock disponible',
                    pendingProducts: result.pendingProducts,
                });
            }

            return res.json({
                status: 'success',
                message: result.pendingProducts.length > 0
                    ? 'Compra parcial: algunos productos se quedaron sin stock y siguen en tu carrito'
                    : 'Compra realizada con exito',
                payload: result.ticket,
                pendingProducts: result.pendingProducts,
            });
        } catch (error) {
            next(error);
        }
    },
};

export default cartsController;
