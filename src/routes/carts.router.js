import { Router } from 'express';
import cartsController from '../controllers/carts.controller.js';
import { authCurrent } from '../middlewares/current.middleware.js';
import { isUser } from '../middlewares/roles.middleware.js';

// Todo el modulo de carrito es exclusivo del rol "user": un admin
// administra el catalogo, no compra productos desde este backend.
const router = Router();
router.use(authCurrent, isUser);

router.get('/', cartsController.getMine);
router.post('/product/:pid', cartsController.addProduct);
router.put('/product/:pid', cartsController.updateProduct);
router.delete('/product/:pid', cartsController.removeProduct);
router.delete('/', cartsController.clear);
router.post('/purchase', cartsController.purchase);

export default router;
