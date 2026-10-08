import cartDao from '../dao/cart.dao.js';
import productRepository from './product.repository.js';
import ticketRepository from './ticket.repository.js';
import { RepositoryError } from '../utils/errors.js';

// El carrito se crea de forma perezosa: recien se guarda en la base la
// primera vez que el usuario hace algo con el (ver, agregar, etc.), asi
// no hace falta tocar el flujo de registro para crear uno vacio.
async function getOrCreate(userId) {
    let cart = await cartDao.findByUser(userId);
    if (!cart) cart = await cartDao.create(userId);
    return cart;
}

// Repository: logica de negocio del carrito y de la compra (stock,
// totales, armado del ticket) apoyada en el cartDao y en los otros
// repositories (producto, ticket). Los controllers solo hablan con esto.
const cartRepository = {
    async getMine(userId) {
        await getOrCreate(userId);
        return cartDao.findPopulatedByUser(userId);
    },

    async addProduct(userId, productId, quantity = 1) {
        if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new RepositoryError('La cantidad debe ser un entero mayor a 0', 400);
        }
        await productRepository.ensureStock(productId, quantity);

        const cart = await getOrCreate(userId);
        const item = cart.products.find((p) => String(p.product) === String(productId));
        if (item) {
            item.quantity += quantity;
        } else {
            cart.products.push({ product: productId, quantity });
        }
        await cartDao.save(cart);
        return cartDao.findPopulatedByUser(userId);
    },

    async updateQuantity(userId, productId, quantity) {
        if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new RepositoryError('La cantidad debe ser un entero mayor a 0', 400);
        }
        await productRepository.ensureStock(productId, quantity);

        const cart = await getOrCreate(userId);
        const item = cart.products.find((p) => String(p.product) === String(productId));
        if (!item) throw new RepositoryError('El producto no esta en el carrito', 404);

        item.quantity = quantity;
        await cartDao.save(cart);
        return cartDao.findPopulatedByUser(userId);
    },

    async removeProduct(userId, productId) {
        const cart = await getOrCreate(userId);
        cart.products = cart.products.filter((p) => String(p.product) !== String(productId));
        await cartDao.save(cart);
        return cartDao.findPopulatedByUser(userId);
    },

    async clear(userId) {
        const cart = await getOrCreate(userId);
        cart.products = [];
        return cartDao.save(cart);
    },

    // Confirma la compra: por cada item valida stock en tiempo real.
    // Los productos con stock suficiente entran al ticket y descuentan
    // stock; los que no, quedan en el carrito para que el usuario los
    // revise despues (no se pierde la seleccion).
    async purchase(userId, purchaserEmail) {
        await getOrCreate(userId);
        const cart = await cartDao.findPopulatedByUser(userId);

        const remaining = [];
        const ticketItems = [];
        let amount = 0;

        for (const item of cart.products) {
            const product = item.product;
            const quantity = item.quantity;

            if (!product || product.stock < quantity) {
                remaining.push({ product: product?._id, quantity });
                continue;
            }

            await productRepository.decrementStock(product._id, quantity);
            amount += product.price * quantity;
            ticketItems.push({
                product: product._id,
                title: product.title,
                price: product.price,
                quantity,
            });
        }

        let ticket = null;
        if (ticketItems.length > 0) {
            ticket = await ticketRepository.create({
                amount,
                purchaser: purchaserEmail,
                products: ticketItems,
            });
        }

        cart.products = remaining;
        await cartDao.save(cart);

        return {
            ticket,
            pendingProducts: remaining.map((r) => String(r.product)).filter(Boolean),
        };
    },
};

export default cartRepository;
