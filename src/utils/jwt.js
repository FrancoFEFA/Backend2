import jwt from 'jsonwebtoken';

// Obtiene la clave secreta en cada uso para respetar el dotenv cargado en app
function getSecret() {
    return process.env.JWT_SECRET || 'jwtSecretBackendII';
}

// Obtiene la expiracion configurada con valor de una hora por defecto
function getExpiresIn() {
    return process.env.JWT_EXPIRES_IN || '1h';
}

// Genera un token firmado con los datos minimos del usuario
export function generateToken(user) {
    const payload = {
        id: user._id,
        email: user.email,
        role: user.role || 'user'
    };

    return jwt.sign(payload, getSecret(), { expiresIn: getExpiresIn() });
}

// Verifica un token y devuelve su contenido si es valido
export function verifyToken(token) {
    return jwt.verify(token, getSecret());
}
