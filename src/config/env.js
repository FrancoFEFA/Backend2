import 'dotenv/config';

// Configuracion centralizada de variables de entorno.
// Se lee una sola vez al arrancar la aplicacion: si falta algo critico en
// produccion, la app falla aca mismo en vez de fallar a mitad de una request.
const NODE_ENV = (process.env.NODE_ENV || 'development').toLowerCase();
const isProduction = NODE_ENV === 'production';

// En desarrollo se usan secretos por defecto para no bloquear el arranque;
// en produccion son obligatorios.
function required(name, devFallback) {
    const value = process.env[name];
    if (value) return value;
    if (isProduction) {
        throw new Error(`Falta la variable de entorno obligatoria en produccion: ${name}`);
    }
    return devFallback;
}

const port = Number(process.env.PORT) || 8080;

export const env = {
    nodeEnv: NODE_ENV,
    isProduction,
    port,

    mongodbUri: process.env.MONGODB_URI,

    // Secreto de las sesiones de Passport (cookie connect.sid)
    sessionSecret: required('SESSION_SECRET', 'coderSecretBackendII'),

    // Secreto para firmar la cookie httpOnly que guarda el JWT de acceso
    cookieSecret: required('COOKIE_SECRET', 'coderCookieSecretBackendII'),

    // JWT de acceso: lo valida la estrategia Passport "current"
    jwtSecret: required('JWT_SECRET', 'jwtSecretBackendII'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',

    // JWT de un solo proposito para recuperar contraseña: secreto propio
    // para que nunca se pueda reutilizar un token de reset como token de acceso.
    jwtResetSecret: required('JWT_RESET_SECRET', 'jwtResetSecretBackendII'),
    jwtResetExpiresIn: process.env.JWT_RESET_EXPIRES_IN || '1h',

    github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackUrl: process.env.GITHUB_CALLBACK_URL || `http://localhost:${port}/api/sessions/github/callback`,
    },

    // Base publica de la app, usada para armar el link del mail de reset
    appBaseUrl: process.env.APP_BASE_URL || `http://localhost:${port}`,

    mail: {
        service: process.env.MAIL_SERVICE || 'gmail',
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : undefined,
        secure: process.env.MAIL_SECURE === 'true',
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
        from: process.env.MAIL_FROM || process.env.MAIL_USER,
    },
};
