import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GithubStrategy } from 'passport-github2';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import userModel from '../../models/user.model.js';
import { findMemoryUserByEmail, findMemoryUserById, findMemoryUserByGithubId, createMemoryUser, updateMemoryUser } from '../utils/memoryStore.js';

// Utilidad para hashear la contrasena con bcrypt
async function createHash(password) {
    return await bcrypt.hash(password, 10);
}

// Utilidad para comparar contrasena plana con hash
async function isValidPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}

// Verifica si MongoDB esta conectado
function isDbConnected() {
    return mongoose.connection.readyState === 1;
}

// Busca usuario por email con fallback a memoria
async function findUserByEmail(email) {
    if (isDbConnected()) {
        try {
            return await userModel.findOne({ email });
        } catch (e) {
            console.log("Fallo DB en findUserByEmail, usando memoria:", e.message);
            return findMemoryUserByEmail(email);
        }
    }
    return findMemoryUserByEmail(email);
}

// Busca usuario por githubId con fallback a memoria
async function findUserByGithubId(githubId) {
    if (isDbConnected()) {
        try {
            return await userModel.findOne({ githubId });
        } catch (e) {
            console.log("Fallo DB en findUserByGithubId, usando memoria:", e.message);
            return findMemoryUserByGithubId(githubId);
        }
    }
    return findMemoryUserByGithubId(githubId);
}

// Busca usuario por id con fallback a memoria
async function findUserById(id) {
    if (isDbConnected()) {
        try {
            const user = await userModel.findById(id).lean();
            if (user) return user;
            return findMemoryUserById(id);
        } catch (e) {
            console.log("Fallo DB en findUserById, usando memoria:", e.message);
            return findMemoryUserById(id);
        }
    }
    return findMemoryUserById(id);
}

// Crea usuario con fallback a memoria
async function createUser(data) {
    if (isDbConnected()) {
        try {
            return await userModel.create(data);
        } catch (e) {
            console.log("Fallo al crear en DB, usando memoria:", e.message);
            return createMemoryUser(data);
        }
    }
    return createMemoryUser(data);
}

// Configura las estrategias de Passport y la serializacion
export function initializePassport() {

    // Estrategia de registro con Passport-Local
    passport.use('register', new LocalStrategy(
        { passReqToCallback: true, usernameField: 'email' },
        async (req, email, password, done) => {
            try {
                const { first_name, last_name, age, role } = req.body;

                // Valida campos obligatorios
                if (!first_name || !last_name || !email || !password) {
                    return done(null, false, { message: "Faltan parametros obligatorios" });
                }

                // Verifica si el usuario ya existe
                const exists = await findUserByEmail(email);
                if (exists) {
                    return done(null, false, { message: "El usuario ya existe" });
                }

                // Protege la contrasena hasheandola antes de guardar
                const hashedPassword = await createHash(password);

                // Crea el usuario con rol por defecto user
                const newUser = await createUser({
                    first_name,
                    last_name,
                    email,
                    age,
                    password: hashedPassword,
                    role: "user",
                    provider: "local"
                });

                return done(null, newUser);

            } catch (error) {
                return done(error);
            }
        }
    ));

    // Estrategia de login con Passport-Local
    passport.use('login', new LocalStrategy(
        { usernameField: 'email' },
        async (email, password, done) => {
            try {
                // Valida que se envien credenciales
                if (!email || !password) {
                    return done(null, false, { message: "Email y password son obligatorios" });
                }

                // Busca el usuario por email
                const user = await findUserByEmail(email);
                if (!user) {
                    return done(null, false, { message: "Credenciales invalidas" });
                }

                // Si es usuario de GitHub sin password no puede loguearse con local
                if (!user.password) {
                    return done(null, false, { message: "Usa login con GitHub para esta cuenta" });
                }

                // Compara la contrasena ingresada con el hash almacenado
                const valid = await isValidPassword(password, user.password);
                if (!valid) {
                    return done(null, false, { message: "Credenciales invalidas" });
                }

                return done(null, user);

            } catch (error) {
                return done(error);
            }
        }
    ));

    // Estrategia de GitHub para autenticacion por terceros
    passport.use('github', new GithubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:8080/api/sessions/github/callback",
            scope: ['user:email']
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const githubId = String(profile.id);
                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
                const displayName = profile.displayName || profile.username || "GitHub User";

                // Separa nombre y apellido del displayName
                let first_name = displayName;
                let last_name = "";
                if (displayName.includes(" ")) {
                    const parts = displayName.split(" ");
                    first_name = parts[0];
                    last_name = parts.slice(1).join(" ");
                }

                // Si no hay email de GitHub no se puede continuar
                if (!email) {
                    return done(null, false, { message: "GitHub no proporciono email" });
                }

                // Busca si ya existe usuario con ese githubId
                let user = await findUserByGithubId(githubId);
                if (user) {
                    return done(null, user);
                }

                // Si el correo coincide con uno ya registrado hace login normal vinculando githubId
                const existingByEmail = await findUserByEmail(email);
                if (existingByEmail) {
                    // Vincula el githubId al usuario existente y mantiene rol user
                    if (isDbConnected()) {
                        try {
                            const updated = await userModel.findByIdAndUpdate(
                                existingByEmail._id,
                                { githubId, provider: "github" },
                                { new: true, lean: true }
                            );
                            return done(null, updated || existingByEmail);
                        } catch (e) {
                            console.log("Fallo al vincular githubId en DB:", e.message);
                            updateMemoryUser(existingByEmail._id, { githubId, provider: "github" });
                            return done(null, existingByEmail);
                        }
                    } else {
                        updateMemoryUser(existingByEmail._id, { githubId, provider: "github" });
                        return done(null, existingByEmail);
                    }
                }

                // Si no existe crea un nuevo usuario con rol user siempre
                const newUser = await createUser({
                    first_name,
                    last_name: last_name || " ",
                    email,
                    password: null,
                    age: null,
                    role: "user",
                    githubId,
                    provider: "github"
                });

                return done(null, newUser);

            } catch (error) {
                return done(error);
            }
        }
    ));

    // Serializa el usuario guardando solo el id en la sesion
    passport.serializeUser((user, done) => {
        done(null, user._id);
    });

    // Deserializa el usuario buscando por id en cada request
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await findUserById(id);
            // Convierte a objeto plano para que Handlebars pueda acceder a las propiedades
            const plainUser = user?.toObject ? user.toObject() : user;
            done(null, plainUser);
        } catch (error) {
            done(error);
        }
    });
}
