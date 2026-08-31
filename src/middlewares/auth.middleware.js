// Middleware que verifica si el usuario tiene una sesion activa via Passport

// Verifica si existe autenticacion via Passport
export function isAuthenticated(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }

    // Si la peticion es de tipo API responde con JSON
    if (req.path.startsWith('/api/')) {
        return res.status(401).send({ status: "error", message: "No autenticado. Inicia sesion primero." });
    }

    // Si es navegacion web redirige al login
    return res.redirect('/login');
}

// Verifica que el usuario NO este autenticado para acceder a login/register
export function isNotAuthenticated(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return res.redirect('/profile');
    }
    return next();
}
