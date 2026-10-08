// Middleware de autorizacion por rol. Trabaja sobre `req.user`, sin
// importar si lo poblo la sesion de Passport (vistas Handlebars) o la
// estrategia "current" vía JWT en cookie (API /api/products y /api/carts).

function wantsJson(req) {
    return req.path.startsWith('/api/') || req.headers.accept?.includes('application/json');
}

// Fabrica un middleware que solo deja pasar a los roles indicados.
export function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            if (wantsJson(req)) {
                return res.status(401).json({ status: 'error', message: 'No autenticado.' });
            }
            return res.redirect('/login');
        }

        if (!allowedRoles.includes(req.user.role)) {
            if (wantsJson(req)) {
                return res.status(403).json({ status: 'error', message: 'Acceso denegado. Rol insuficiente.' });
            }
            return res.status(403).send('Acceso denegado. No tenes permisos para esta ruta.');
        }

        return next();
    };
}

// Solo administradores: crear, actualizar y eliminar productos.
export const isAdmin = authorizeRoles('admin');

// Estrictamente usuarios "user": el carrito y la compra son una
// funcionalidad del cliente, no del administrador del catalogo.
export const isUser = authorizeRoles('user');
