import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import userModel from '../../models/user.model.js';
import { findMemoryUserByEmail, findMemoryUserById, createMemoryUser } from '../utils/memoryStore.js';

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
                    role: role || "user"
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
