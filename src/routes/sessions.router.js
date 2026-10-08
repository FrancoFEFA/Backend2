import { Router } from 'express';
import passport from 'passport';
import sessionsController from '../controllers/sessions.controller.js';

// Router de sesiones: Passport maneja register/login/github (sesion para
// las vistas Handlebars) y ademas emite el JWT de acceso que consume la
// estrategia "current" en toda la API JSON.
const router = Router();

router.post('/register', sessionsController.register);
router.post('/login', sessionsController.login);

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: '/login', session: true }),
    sessionsController.githubCallbackSuccess
);

// Protegida por la estrategia "current" (JWT en cookie httpOnly).
router.get('/current', passport.authenticate('current', { session: false }), sessionsController.current);

router.get('/logout', sessionsController.logout);
router.post('/logout', sessionsController.logout);

// Sistema de recuperacion de contraseña.
router.post('/forgot-password', sessionsController.forgotPassword);
router.post('/reset-password', sessionsController.resetPassword);

export default router;
