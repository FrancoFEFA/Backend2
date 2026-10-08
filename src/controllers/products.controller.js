import productRepository from '../repositories/product.repository.js';

const productsController = {
    async list(req, res, next) {
        try {
            const products = await productRepository.list();
            res.json({ status: 'success', payload: products });
        } catch (error) {
            next(error);
        }
    },

    async getById(req, res, next) {
        try {
            const product = await productRepository.getById(req.params.pid);
            res.json({ status: 'success', payload: product });
        } catch (error) {
            next(error);
        }
    },

    // Solo admin (ver products.router.js): crea un producto nuevo.
    async create(req, res, next) {
        try {
            const product = await productRepository.create(req.body);
            res.status(201).json({ status: 'success', payload: product });
        } catch (error) {
            next(error);
        }
    },

    // Solo admin: actualiza campos del producto.
    async update(req, res, next) {
        try {
            const product = await productRepository.update(req.params.pid, req.body);
            res.json({ status: 'success', payload: product });
        } catch (error) {
            next(error);
        }
    },

    // Solo admin: elimina el producto.
    async remove(req, res, next) {
        try {
            await productRepository.remove(req.params.pid);
            res.json({ status: 'success', message: 'Producto eliminado' });
        } catch (error) {
            next(error);
        }
    },
};

export default productsController;
