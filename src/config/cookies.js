import { env } from './env.js';

// Nombre de la cookie firmada que guarda el JWT de acceso usado por la
// estrategia Passport "current".
export const CURRENT_USER_COOKIE = 'currentToken';

export const currentUserCookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    signed: true,
    path: '/',
    maxAge: 1000 * 60 * 60, // 1h, coherente con JWT_EXPIRES_IN por defecto
};

// Al limpiar la cookie no van `signed` ni `maxAge`: alcanza con el mismo
// path para que el navegador la identifique y la borre.
export const currentUserCookieClearOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    path: '/',
};
