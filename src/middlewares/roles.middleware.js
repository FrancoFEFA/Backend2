// Middleware que verifica el rol del usuario autenticado via Passport

// Fabrica un middleware que compara el rol en req.user con el requerido
export function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            if (req.path.startsWith('/api/')) {
                return res.status(401).send({ status: "error", message: "No autenticado." });
            }
            return res.redirect('/login');
        }

        const userRole = req.user?.role;

        // Verifica si el rol del usuario esta dentro de los permitidos
        if (!allowedRoles.includes(userRole)) {
            if (req.path.startsWith('/api/')) {
                return res.status(403).send({ status: "error", message: "Acceso denegado. Rol insuficiente." });
            }
            return res.status(403).send("Acceso denegado. No tenes permisos para esta ruta.");
        }

        return next();
    };
}

// Atajo para rutas solo de administrador
export const isAdmin = authorizeRoles("admin");

// Atajo para cualquier usuario autenticado con rol valido
export const isUser = authorizeRoles("user", "admin");
