import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const RESET_PURPOSE = 'password-reset';

// El token de reset es un JWT de proposito unico y vida corta:
// - expira solo a la hora (JWT_RESET_EXPIRES_IN, verificado por jwt.verify)
// - usa un secreto propio (JWT_RESET_SECRET), distinto al de los tokens
//   de acceso, para que no sirva como token de sesion
// - incluye un "snapshot" del hash de la contraseña actual: si el usuario
//   ya cambio la contraseña (por ejemplo, reusando un link viejo despues
//   de resetearla una vez), el snapshot no va a coincidir mas y el token
//   queda invalidado aunque todavia no haya expirado (un solo uso efectivo).
export function generatePasswordResetToken(user) {
    return jwt.sign(
        {
            id: String(user._id),
            passwordSnapshot: user.password,
            purpose: RESET_PURPOSE,
        },
        env.jwtResetSecret,
        { expiresIn: env.jwtResetExpiresIn }
    );
}

// Lanza si el token es invalido, de otro proposito, o expirado.
export function verifyPasswordResetToken(token) {
    const payload = jwt.verify(token, env.jwtResetSecret);
    if (payload.purpose !== RESET_PURPOSE) {
        throw new Error('El token no es un token de recuperacion de contraseña valido');
    }
    return payload;
}
