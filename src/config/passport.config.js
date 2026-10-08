import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GithubStrategy } from 'passport-github2';
import { Strategy as JwtStrategy } from 'passport-jwt';
import userRepository from '../repositories/user.repository.js';
import { RepositoryError } from '../utils/errors.js';
import { env } from './env.js';
import { CURRENT_USER_COOKIE } from './cookies.js';

// Extrae el JWT de acceso de la cookie firmada `currentToken`. Es el
// equivalente a `ExtractJwt.fromAuthHeaderAsBearerToken()` pero leyendo
// de una cookie httpOnly en vez del header Authorization.
function cookieExtractor(req) {
    return req?.signedCookies?.[CURRENT_USER_COOKIE] || null;
}

export function initializePassport() {
    // Estrategia de registro con Passport-Local. Toda la regla de negocio
    // (duplicados, hash de password) vive en userRepository, no aca.
    passport.use('register', new LocalStrategy(
        { passReqToCallback: true, usernameField: 'email' },
        async (req, email, password, done) => {
            try {
                const { first_name, last_name, age } = req.body;

                if (!first_name || !last_name || !email || !password) {
                    return done(null, false, { message: 'Faltan parametros obligatorios' });
                }

                const newUser = await userRepository.registerLocalUser({ first_name, last_name, email, age, password });
                return done(null, newUser);
            } catch (error) {
                if (error instanceof RepositoryError) return done(null, false, { message: error.message });
                return done(error);
            }
        }
    ));

    // Estrategia de login con Passport-Local.
    passport.use('login', new LocalStrategy(
        { usernameField: 'email' },
        async (email, password, done) => {
            try {
                if (!email || !password) {
                    return done(null, false, { message: 'Email y password son obligatorios' });
                }

                const user = await userRepository.validateCredentials(email, password);
                if (!user) return done(null, false, { message: 'Credenciales invalidas' });

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        }
    ));

    // Estrategia de GitHub para autenticacion por terceros.
    passport.use('github', new GithubStrategy(
        {
            clientID: env.github.clientId,
            clientSecret: env.github.clientSecret,
            callbackURL: env.github.callbackUrl,
            scope: ['user:email'],
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const user = await userRepository.findOrCreateGithubUser(profile);
                return done(null, user);
            } catch (error) {
                if (error instanceof RepositoryError) return done(null, false, { message: error.message });
                return done(error);
            }
        }
    ));

    // Estrategia "current": valida el JWT de acceso guardado en la cookie
    // httpOnly `currentToken` y vuelve a leer el usuario desde la base
    // (nunca confia solo en el payload del token), para que un cambio de
    // rol o un borrado de cuenta invaliden el acceso en el acto. Esta es
    // la estrategia contra la que trabajan los middlewares de autorizacion
    // (isAdmin / isUser) para proteger productos y carritos.
    passport.use('current', new JwtStrategy(
        { jwtFromRequest: cookieExtractor, secretOrKey: env.jwtSecret },
        async (payload, done) => {
            try {
                const user = await userRepository.findById(payload.id);
                if (!user) return done(null, false);
                return done(null, user);
            } catch (error) {
                return done(error);
            }
        }
    ));

    // Serializa el usuario guardando solo el id en la sesion (usada por
    // las vistas Handlebars: login/profile/admin).
    passport.serializeUser((user, done) => {
        done(null, user._id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await userRepository.findById(id);
            const plainUser = user?.toObject ? user.toObject() : user;
            done(null, plainUser);
        } catch (error) {
            done(error);
        }
    });
}
