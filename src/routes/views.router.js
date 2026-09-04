import { Router } from 'express';
import { isAuthenticated, isNotAuthenticated } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/roles.middleware.js';

// Router encargado de renderizar las vistas con Passport
const router = Router();

// Redirige la raiz al login
router.get('/', (req, res) => {
    return res.redirect('/login');
});

// Muestra el formulario de login solo si no hay sesion
router.get('/login', isNotAuthenticated, (req, res) => {
    return res.render('login', { title: "Login" });
});

// Muestra el formulario de registro solo si no hay sesion
router.get('/register', isNotAuthenticated, (req, res) => {
    return res.render('register', { title: "Registro" });
});

// Muestra el perfil del usuario autenticado via Passport
router.get('/profile', isAuthenticated, (req, res) => {
    // Convierte a objeto plano por si el deserializado es documento y pasa a la vista
    const plainUser = req.user?.toObject ? req.user.toObject() : req.user;
    delete plainUser?.password;
    return res.render('profile', { user: plainUser, title: "Perfil" });
});

// Ruta protegida solo para administradores via Passport y roles
router.get('/admin', isAuthenticated, authorizeRoles("admin"), (req, res) => {
    const plainUser = req.user?.toObject ? req.user.toObject() : req.user;
    delete plainUser?.password;
    return res.render('admin', { user: plainUser, title: "Admin Panel" });
});

// Ruta protegida que muestra la sesion actual via Passport
router.get('/current', isAuthenticated, (req, res) => {
    const plainUser = req.user?.toObject ? req.user.toObject() : req.user;
    delete plainUser?.password;
    return res.render('current', { user: plainUser, title: "Sesion Actual" });
});

// Muestra la interfaz publica para probar el flujo JWT sin estado
router.get('/jwt', (req, res) => {
    return res.render('jwt', { title: "Prueba JWT" });
});

export default router;
