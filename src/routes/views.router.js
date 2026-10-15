import { Router } from 'express';
import { isAuthenticated, isNotAuthenticated } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/roles.middleware.js';

// Router encargado de renderizar las vistas con Passport
const router = Router();

// Convierte el usuario de Passport a objeto plano y le saca el hash de la
// contraseña antes de pasarlo a las vistas (mismo criterio en todas las rutas).
function toPlainUser(user) {
    const plainUser = user?.toObject ? user.toObject() : user;
    delete plainUser?.password;
    return plainUser;
}

// Redirige la raiz segun el estado de la sesion: si ya estas logueado te
// lleva al panel de inicio, sino al login.
router.get('/', (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return res.redirect('/home');
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

// Panel de inicio: destino por defecto despues de iniciar sesion. Muestra
// los accesos disponibles segun el rol del usuario.
router.get('/home', isAuthenticated, (req, res) => {
    return res.render('home', { user: toPlainUser(req.user), title: "Inicio" });
});

// Catalogo de productos. La lectura es publica en la API, pero aca la
// mostramos dentro del area autenticada para engancharla con el carrito
// (rol user) y con el CRUD (rol admin).
router.get('/products', isAuthenticated, (req, res) => {
    return res.render('products', { user: toPlainUser(req.user), title: "Productos" });
});

// Carrito: funcionalidad exclusiva del rol "user", igual que en la API.
router.get('/cart', isAuthenticated, authorizeRoles("user"), (req, res) => {
    return res.render('cart', { user: toPlainUser(req.user), title: "Mi carrito" });
});

// Muestra el perfil del usuario autenticado via Passport
router.get('/profile', isAuthenticated, (req, res) => {
    return res.render('profile', { user: toPlainUser(req.user), title: "Perfil" });
});

// Ruta protegida solo para administradores via Passport y roles
router.get('/admin', isAuthenticated, authorizeRoles("admin"), (req, res) => {
    return res.render('admin', { user: toPlainUser(req.user), title: "Admin Panel" });
});

// Ruta protegida que muestra la sesion actual via Passport
router.get('/current', isAuthenticated, (req, res) => {
    return res.render('current', { user: toPlainUser(req.user), title: "Sesion Actual" });
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
