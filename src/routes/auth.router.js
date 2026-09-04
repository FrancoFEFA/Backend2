import { Router } from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import userModel from '../../models/user.model.js';
import { findMemoryUserByEmail, createMemoryUser } from '../utils/memoryStore.js';
import { generateToken } from '../utils/jwt.js';
import { authJWT, authorizeJwtRoles } from '../middlewares/jwt.middleware.js';

// Crea el router de autenticacion sin estado con JWT
const router = Router();

// Revisa si la base esta conectada para elegir Mongo o memoria
function isDbConnected() {
    return mongoose.connection.readyState === 1;
}

// Busca un usuario por email con respaldo en memoria
async function findUserByEmail(email) {
    if (isDbConnected()) {
        try {
            return await userModel.findOne({ email });
        } catch (e) {
            console.log("Fallo DB en auth JWT, usando memoria:", e.message);
            return findMemoryUserByEmail(email);
        }
    }
    return findMemoryUserByEmail(email);
}

// Crea un usuario con respaldo en memoria si Mongo no responde
async function createUser(data) {
    if (isDbConnected()) {
        try {
            return await userModel.create(data);
        } catch (e) {
            console.log("Fallo al crear en DB desde auth JWT, usando memoria:", e.message);
            return createMemoryUser(data);
        }
    }
    return createMemoryUser(data);
}

// Quita el password antes de devolver un usuario al cliente
function sanitizeUser(user) {
    if (!user) return null;
    const obj = user.toObject ? user.toObject() : { ...user };
    delete obj.password;
    return obj;
}

// Ruta de registro que cifra la clave antes de guardar
router.post('/register', async (req, res) => {
    try {
        const { first_name, last_name, email, age, password } = req.body;

        // Pide los datos minimos para crear la cuenta
        if (!first_name || !last_name || !email || !password) {
            return res.status(400).send({ status: "error", message: "Faltan parametros obligatorios" });
        }

        // Evita duplicados buscando por email
        const exists = await findUserByEmail(email);
        if (exists) {
            return res.status(400).send({ status: "error", message: "El usuario ya existe" });
        }

        // Protege la clave con hash antes de guardarla
        const hashedPassword = await bcrypt.hash(password, 10);

        // Guarda el usuario siempre con rol user para JWT
        const newUser = await createUser({
            first_name,
            last_name,
            email,
            age,
            password: hashedPassword,
            role: "user",
            provider: "local"
        });

        // Genera el token para que entre directo sin loguearse de nuevo
        const token = generateToken(newUser);

        return res.status(201).send({ status: "success", message: "Usuario registrado", token, payload: sanitizeUser(newUser) });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ status: "error", message: "Error al registrar usuario con JWT" });
    }
});

// Ruta de login que valida credenciales y devuelve un token
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Pide email y clave para poder validar
        if (!email || !password) {
            return res.status(400).send({ status: "error", message: "Email y password son obligatorios" });
        }

        // Busca al usuario por su email
        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(401).send({ status: "error", message: "Credenciales invalidas" });
        }

        // Las cuentas de GitHub sin clave no entran por este login
        if (!user.password) {
            return res.status(401).send({ status: "error", message: "Usa login con GitHub para esta cuenta" });
        }

        // Compara la clave ingresada con el hash guardado
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).send({ status: "error", message: "Credenciales invalidas" });
        }

        // Firma un token con vigencia definida para sus proximas peticiones
        const token = generateToken(user);

        return res.send({ status: "success", message: "Login exitoso", token, payload: sanitizeUser(user) });
    } catch (error) {
        console.log(error);
        return res.status(500).send({ status: "error", message: "Error al iniciar sesion con JWT" });
    }
});

// Ruta protegida que devuelve los datos que viajan dentro del token
router.get('/current', authJWT, (req, res) => {
    return res.send({ status: "success", payload: req.jwtUser });
});

// Ruta de ejemplo que solo abre si el token es valido
router.get('/protected', authJWT, (req, res) => {
    return res.send({ status: "success", message: "Acceso a ruta protegida con JWT", user: req.jwtUser });
});

// Ruta solo para admin que pide token con rol admin
router.get('/admin', authJWT, authorizeJwtRoles("admin"), (req, res) => {
    return res.send({ status: "success", message: "Panel admin con JWT", user: req.jwtUser });
});

export default router;
