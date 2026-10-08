import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Genera el JWT de acceso que se guarda en la cookie httpOnly y que la
// estrategia Passport "current" valida en cada request.
export function generateToken(user) {
    const payload = {
        id: user._id,
        email: user.email,
        role: user.role || 'user',
    };

    return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifyToken(token) {
    return jwt.verify(token, env.jwtSecret);
}
