import { verifyToken } from '../utils/jwt.js';

// Middleware que protege rutas verificando el JWT del header Authorization
export function authJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    // Si no hay header avisa que falta el token
    if (!authHeader) {
        return res.status(401).send({ status: "error", message: "Falta el token. Envia Authorization: Bearer <token>" });
    }

    // Separa el esquema Bearer del token real
    const parts = authHeader.split(' ');

    // Valida que el formato sea Bearer mas token
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).send({ status: "error", message: "Formato invalido. Usa Authorization: Bearer <token>" });
    }

    const token = parts[1];

    // Verifica la firma y la expiracion del token
    try {
        const decoded = verifyToken(token);

        // Guarda los datos del token para usarlos en la ruta
        req.jwtUser = decoded;
        return next();
    } catch (error) {
        // Si expiro avisa con 403 para diferenciarlo del token ausente
        if (error.name === 'TokenExpiredError') {
            return res.status(403).send({ status: "error", message: "Token expirado. Inicia sesion de nuevo." });
        }

        return res.status(403).send({ status: "error", message: "Token invalido. Autenticacion fallida." });
    }
}

// Fabrica un middleware que pide un rol puntual en el token
export function authorizeJwtRoles(...allowedRoles) {
    return (req, res, next) => {
        // Si no paso por authJWT no hay usuario para evaluar
        if (!req.jwtUser) {
            return res.status(401).send({ status: "error", message: "No autenticado con JWT." });
        }

        // Compara el rol del token con los permitidos
        if (!allowedRoles.includes(req.jwtUser.role)) {
            return res.status(403).send({ status: "error", message: "Acceso denegado. Rol insuficiente." });
        }

        return next();
    };
}
