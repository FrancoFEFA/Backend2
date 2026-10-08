import { Router } from 'express';
import { isAuthenticated, isNotAuthenticated } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/roles.middleware.js';

// Router encargado de renderizar las vistas con Passport
const router = Router();

// Redirige la raiz segun el estado de la sesion: si ya estas logueado te
// lleva al perfil directo, sino al login.
router.get('/', (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return res.redirect('/profile');
    }
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

// Formulario para pedir el mail de recuperacion de contraseña
router.get('/forgot-password', isNotAuthenticated, (req, res) => {
    return res.render('forgot-password', { title: "Recuperar contraseña" });
});

// Formulario de nueva contraseña. El token viaja por query string, lo
// valida recien el POST a /api/sessions/reset-password.
router.get('/reset-password', isNotAuthenticated, (req, res) => {
    return res.render('reset-password', { title: "Restablecer contraseña", token: req.query.token || "" });
});

export default router;
