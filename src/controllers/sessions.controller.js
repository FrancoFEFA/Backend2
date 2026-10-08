import passport from 'passport';
import userRepository from '../repositories/user.repository.js';
import { toCurrentUserDTO } from '../dto/user.dto.js';
import { generateToken } from '../utils/jwt.js';
import { env } from '../config/env.js';
import {
    CURRENT_USER_COOKIE,
    currentUserCookieOptions,
    currentUserCookieClearOptions,
} from '../config/cookies.js';
import { generatePasswordResetToken, verifyPasswordResetToken } from '../services/password-reset.service.js';
import { sendPasswordResetEmail } from '../services/mail.service.js';
import { RepositoryError } from '../utils/errors.js';

// Ademas de iniciar la sesion de Passport (para las vistas Handlebars),
// cada login/registro/callback de GitHub emite el JWT de acceso en una
// cookie httpOnly. Ese token es el que valida la estrategia "current"
// para toda la API JSON (/api/sessions/current, /api/products, /api/carts).
function issueCurrentCookie(res, user) {
    const token = generateToken(user);
    res.cookie(CURRENT_USER_COOKIE, token, currentUserCookieOptions);
}

const sessionsController = {
    register(req, res, next) {
        passport.authenticate('register', (err, user, info) => {
            if (err) return next(err);
            if (!user) {
                return res.status(400).json({ status: 'error', message: info?.message || 'Error al registrar usuario' });
            }

            req.logIn(user, (err) => {
                if (err) return next(err);
                issueCurrentCookie(res, user);
                req.session.flash = {
                    type: 'success',
                    message: 'Registro exitoso. ¡Bienvenido, ' + (user.first_name || user.email) + '!',
                };
                return res.status(201).json({
                    status: 'success',
                    message: 'Usuario registrado',
                    payload: toCurrentUserDTO(user),
                });
            });
        })(req, res, next);
    },

    login(req, res, next) {
        passport.authenticate('login', (err, user, info) => {
            if (err) return next(err);
            if (!user) {
                return res.status(401).json({ status: 'error', message: info?.message || 'Credenciales invalidas' });
            }

            req.logIn(user, (err) => {
                if (err) return next(err);
                issueCurrentCookie(res, user);
                req.session.flash = {
                    type: 'success',
                    message: 'Login exitoso. ¡Hola de nuevo, ' + (user.first_name || user.email) + '!',
                };
                return res.json({
                    status: 'success',
                    message: 'Login exitoso',
                    payload: toCurrentUserDTO(user),
                });
            });
        })(req, res, next);
    },

    // Callback de exito de GitHub: ya paso por passport.authenticate('github')
    // en el router, aca solo falta emitir la cookie JWT y redirigir.
    githubCallbackSuccess(req, res) {
        issueCurrentCookie(res, req.user);
        return res.redirect('/profile');
    },

    // GET /api/sessions/current: protegido por la estrategia "current".
    // Devuelve unicamente el DTO, nunca el documento completo del usuario
    // (sin password, sin githubId, sin __v).
    current(req, res) {
        return res.json({ status: 'success', payload: toCurrentUserDTO(req.user) });
    },

    logout(req, res, next) {
        res.clearCookie(CURRENT_USER_COOKIE, currentUserCookieClearOptions);

        if (!req.isAuthenticated || !req.isAuthenticated()) {
            res.clearCookie('connect.sid');
            if (req.headers.accept?.includes('text/html')) return res.redirect('/login');
            return res.json({ status: 'success', message: 'No habia sesion activa' });
        }

        req.logout((err) => {
            if (err) return next(err);
            req.session.destroy((err) => {
                if (err) return res.status(500).json({ status: 'error', message: 'Error al cerrar sesion' });
                res.clearCookie('connect.sid');
                if (req.headers.accept?.includes('text/html')) return res.redirect('/login');
                return res.json({ status: 'success', message: 'Logout exitoso' });
            });
        });
    },

    // POST /api/sessions/forgot-password: siempre responde el mismo mensaje
    // genérico exista o no el email, para no filtrar que emails estan
    // registrados (user enumeration).
    async forgotPassword(req, res, next) {
        try {
            const { email } = req.body ?? {};
            const genericResponse = {
                status: 'success',
                message: 'Si el email esta registrado, te enviamos instrucciones para restablecer tu contraseña.',
            };

            if (!email) {
                return res.status(400).json({ status: 'error', message: 'El email es obligatorio' });
            }

            const user = await userRepository.findByEmail(String(email).toLowerCase().trim());
            if (!user) return res.json(genericResponse);

            const token = generatePasswordResetToken(user);
            const resetUrl = `${env.appBaseUrl}/reset-password?token=${token}`;

            await sendPasswordResetEmail({ to: user.email, firstName: user.first_name, resetUrl });

            return res.json(genericResponse);
        } catch (error) {
            next(error);
        }
    },

    // POST /api/sessions/reset-password: valida el token (firma, 1h de
    // expiracion y que la contraseña no haya cambiado desde que se emitio)
    // y aplica la nueva contraseña, rechazando que sea igual a la anterior.
    async resetPassword(req, res, next) {
        try {
            const { token, password } = req.body ?? {};
            if (!token || !password) {
                return res.status(400).json({ status: 'error', message: 'Token y nueva contraseña son obligatorios' });
            }

            let payload;
            try {
                payload = verifyPasswordResetToken(token);
            } catch {
                return res.status(400).json({
                    status: 'error',
                    message: 'El enlace es invalido o ya expiro (valido por 1 hora). Pedi uno nuevo.',
                });
            }

            const user = await userRepository.findById(payload.id);
            if (!user || user.password !== payload.passwordSnapshot) {
                return res.status(400).json({
                    status: 'error',
                    message: 'El enlace ya fue usado o ya no es valido. Pedi uno nuevo.',
                });
            }

            await userRepository.updatePassword(user._id, password);
            return res.json({ status: 'success', message: 'Contraseña actualizada correctamente' });
        } catch (error) {
            if (error instanceof RepositoryError) {
                return res.status(error.statusCode).json({ status: 'error', message: error.message });
            }
            next(error);
        }
    },
};

export default sessionsController;
