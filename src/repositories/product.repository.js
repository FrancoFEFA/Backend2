import productDao from '../dao/product.dao.js';
import { RepositoryError } from '../utils/errors.js';

// Repository: reglas de negocio del catalogo (codigo unico, stock,
// existencia) sobre el productDao. Los controllers solo hablan con esto.
const productRepository = {
    async list(filters = {}) {
        return productDao.findAll(filters);
    },

    async getById(id) {
        const product = await productDao.findById(id);
        if (!product) throw new RepositoryError('Producto no encontrado', 404);
        return product;
    },

    async create(data) {
        if (data.code) {
            const existing = await productDao.findByCode(data.code);
            if (existing) throw new RepositoryError('Ya existe un producto con ese codigo', 400);
        }
        return productDao.create(data);
    },

    async update(id, changes) {
        const updated = await productDao.updateById(id, changes);
        if (!updated) throw new RepositoryError('Producto no encontrado', 404);
        return updated;
    },

    async remove(id) {
        const deleted = await productDao.deleteById(id);
        if (!deleted) throw new RepositoryError('Producto no encontrado', 404);
        return deleted;
    },

    // Lanza si no hay stock suficiente; devuelve el producto si esta ok.
    async ensureStock(id, quantity) {
        const product = await this.getById(id);
        if (product.stock < quantity) {
            throw new RepositoryError(`Stock insuficiente para "${product.title}" (disponible: ${product.stock})`, 400);
        }
        return product;
    },

    async decrementStock(id, quantity) {
        return productDao.incrementStock(id, -quantity);
    },
};

export default productRepository;
