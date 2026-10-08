import passport from 'passport';

// Middleware que valida la estrategia Passport "current" (JWT en cookie
// httpOnly). A diferencia de `passport.authenticate('current')` a secas,
// usa un callback propio para responder siempre en JSON y con el mismo
// formato que el resto de la API, en vez del 401 por defecto de Passport.
export function authCurrent(req, res, next) {
    passport.authenticate('current', { session: false }, (err, user) => {
        if (err) return next(err);
        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'No autenticado. Inicia sesion para continuar.',
            });
        }
        req.user = user;
        return next();
    })(req, res, next);
}
