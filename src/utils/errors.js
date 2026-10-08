// Error de dominio para que los repositories informen fallas de negocio
// (usuario duplicado, stock insuficiente, etc.) sin acoplarse a Express.
// El middleware de errores central (middlewares/error.middleware.js) lo
// traduce al status code HTTP correspondiente.
export class RepositoryError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = 'RepositoryError';
        this.statusCode = statusCode;
    }
}
