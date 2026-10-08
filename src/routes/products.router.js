import { Router } from 'express';
import productsController from '../controllers/products.controller.js';
import { authCurrent } from '../middlewares/current.middleware.js';
import { isAdmin } from '../middlewares/roles.middleware.js';

// El catalogo es publico para listar/ver. Crear, actualizar y eliminar
// requiere estar autenticado via la estrategia "current" y tener rol admin.
const router = Router();

router.get('/', productsController.list);
router.get('/:pid', productsController.getById);

router.post('/', authCurrent, isAdmin, productsController.create);
router.put('/:pid', authCurrent, isAdmin, productsController.update);
router.delete('/:pid', authCurrent, isAdmin, productsController.remove);

export default router;
