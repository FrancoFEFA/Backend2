import express, { json, urlencoded } from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import { engine } from 'express-handlebars';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { initializePassport } from './config/passport.config.js';
import { authCurrent } from './middlewares/current.middleware.js';
import { flashMiddleware } from './middlewares/flash.middleware.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';

import sessionsRouter from './routes/sessions.router.js';
import productsRouter from './routes/products.router.js';
import cartsRouter from './routes/carts.router.js';
import viewsRouter from './routes/views.router.js';

// Resuelve __dirname en entorno ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crea la aplicacion de Express
const app = express();

// Configura el motor de plantillas Handlebars
app.engine('handlebars', engine({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    helpers: {
        // Comparacion generica, usada para mostrar el link de Admin solo si el rol coincide
        eq: (a, b) => a === b
    }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Middlewares para parsear JSON y formularios
app.use(json());
app.use(urlencoded({ extended: true }));

// Necesario para leer/escribir la cookie firmada `currentToken` (JWT de
// la estrategia "current").
app.use(cookieParser(env.cookieSecret));

// Intenta conectar a MongoDB con timeout corto para fallback rapido
let dbConnected = false;
try {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 3000 });
    dbConnected = true;
    console.log('Conectado a la base de datos');
} catch (error) {
    console.log('Advertencia: No se pudo conectar a MongoDB Atlas:', error.message);
    console.log('Usando almacenamiento en memoria para usuarios. Para produccion verifica IP whitelist en Atlas.');
}

// Inicializa la configuracion de Passport (local, github, current)
initializePassport();

// Configura el manejo de sesiones con almacenamiento persistente, usadas
// por las vistas Handlebars (login/profile/admin/current).
let sessionStore;
if (dbConnected) {
    sessionStore = MongoStore.create({
        mongoUrl: env.mongodbUri,
        ttl: 60 * 60 * 24,
        collectionName: 'sessions'
    });
    console.log('Sesiones configuradas con MongoStore persistente');
} else {
    console.log('Sesiones configuradas con MemoryStore (no persistente, solo desarrollo)');
}

app.use(session({
    ...(sessionStore && { store: sessionStore }),
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Expone los flash messages (registro/login) en las vistas
app.use(flashMiddleware);

// Monta las rutas de vistas en la raiz
app.use('/', viewsRouter);

// API: sesiones (register/login/github/current/logout/recuperar contraseña)
app.use('/api/sessions', sessionsRouter);

// API: catalogo de productos (lectura publica, mutacion solo admin)
app.use('/api/products', productsRouter);

// API: carrito y compra (exclusivo del rol "user")
app.use('/api/carts', cartsRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', db: dbConnected ? 'connected' : 'memory-fallback' });
});

// Demo de la estrategia "current" protegiendo una ruta suelta
app.get('/api/protected', authCurrent, (req, res) => {
    res.json({ status: 'success', message: 'Acceso a ruta protegida', user: req.user });
});

// 404 y manejo de errores centralizado (siempre al final)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
    console.log(`Servidor escuchando en el puerto ${env.port}`);
});
