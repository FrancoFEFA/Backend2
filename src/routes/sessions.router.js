import { Router } from 'express';
import passport from 'passport';

// Crea el router de sesiones migrado a Passport-Local
const router = Router();

// Helper para sanitizar el usuario sin exponer el password
function sanitizeUser(user) {
    if (!user) return null;
    const obj = user.toObject ? user.toObject() : { ...user };
    delete obj.password;
    return obj;
}

// Ruta POST para registrar con Passport estrategia register
router.post('/register', (req, res, next) => {
    // Usa callback personalizado para responder JSON en vez de redirect
    passport.authenticate('register', (err, user, info) => {
        if (err) {
            return next(err);
        }

        // Si la estrategia rechaza por duplicado o validacion
        if (!user) {
            const message = info?.message || "Error al registrar usuario";
            return res.status(400).send({ status: "error", message });
        }

        // Inicia sesion con Passport para serializar el usuario en la session
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }

            const safeUser = sanitizeUser(user);
            return res.status(201).send({ status: "success", message: "Usuario registrado", payload: safeUser });
        });
    })(req, res, next);
});

// Ruta POST para login con Passport estrategia login
router.post('/login', (req, res, next) => {
    // Usa callback personalizado para mantener formato JSON del proyecto
    passport.authenticate('login', (err, user, info) => {
        if (err) {
            return next(err);
        }

        // Credenciales invalidas segun estrategia
        if (!user) {
            const message = info?.message || "Credenciales invalidas";
            return res.status(401).send({ status: "error", message });
        }

        // Establece la sesion via Passport
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }

            const safeUser = sanitizeUser(user);
            return res.send({ status: "success", message: "Login exitoso", payload: safeUser });
        });
    })(req, res, next);
});

// Ruta GET para obtener el usuario actual desde la sesion Passport
router.get('/current', (req, res) => {
    // Verifica la autenticacion via Passport
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).send({ status: "error", message: "No hay sesion activa" });
    }

    const safeUser = sanitizeUser(req.user);
    return res.send({ status: "success", payload: safeUser });
});

// Ruta GET para cerrar sesion de forma segura con Passport
router.get('/logout', (req, res, next) => {
    // Si no hay sesion autenticada responde directo
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        res.clearCookie('connect.sid');
        if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return res.redirect('/login');
        }
        return res.send({ status: "success", message: "No habia sesion activa" });
    }

    // Ejecuta logout de Passport que limpia req.user
    req.logout((err) => {
        if (err) {
            return next(err);
        }

        // Destruye la sesion en el store y limpia la cookie
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).send({ status: "error", message: "Error al cerrar sesion" });
            }
            res.clearCookie('connect.sid');
            if (req.headers.accept && req.headers.accept.includes('text/html')) {
                return res.redirect('/login');
            }
            return res.send({ status: "success", message: "Logout exitoso" });
        });
    });
});

// Soporte para logout via POST tambien
router.post('/logout', (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        res.clearCookie('connect.sid');
        return res.send({ status: "success", message: "No habia sesion activa" });
    }

    req.logout((err) => {
        if (err) {
            return next(err);
        }

        req.session.destroy((err) => {
            if (err) {
                return res.status(500).send({ status: "error", message: "Error al cerrar sesion" });
            }
            res.clearCookie('connect.sid');
            return res.send({ status: "success", message: "Logout exitoso" });
        });
    });
});

export default router;
