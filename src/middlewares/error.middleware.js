import { RepositoryError } from '../utils/errors.js';

export function notFoundHandler(req, res) {
    res.status(404).json({ status: 'error', message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// Handler central de errores: traduce los RepositoryError (errores de
// negocio conocidos) a su status code, y loguea cualquier otra cosa como
// un 500 sin filtrar detalles internos al cliente.
export function errorHandler(err, req, res, next) {
    if (err instanceof RepositoryError) {
        return res.status(err.statusCode).json({ status: 'error', message: err.message });
    }

    console.error(err);
    return res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Error interno del servidor',
    });
}
