import express, { json, urlencoded } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import { engine } from 'express-handlebars';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import userRouter from '../routes/user.model.js';
import sessionsRouter from './routes/sessions.router.js';
import viewsRouter from './routes/views.router.js';
import { isAuthenticated } from './middlewares/auth.middleware.js';
import { initializePassport } from './config/passport.config.js';

// Carga las variables de entorno desde el archivo .env
dotenv.config();

// Resuelve __dirname en entorno ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crea la aplicacion de Express
const app = express();
const PORT = process.env.PORT || 8080;

// Configura el motor de plantillas Handlebars
app.engine('handlebars', engine({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts')
}));

// Establece el motor de vistas y la carpeta de vistas
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Intenta usar tambien la carpeta views en la raiz como fallback
const rootViews = path.join(__dirname, '..', '..', 'views');
if (fs.existsSync(rootViews)) {
    app.set('views', [path.join(__dirname, 'views'), rootViews]);
}

// Middlewares para parsear JSON y formularios
app.use(json());
app.use(urlencoded({ extended: true }));

// Sirve archivos estaticos si existen en public
app.use(express.static(path.join(__dirname, 'public')));

// Intenta conectar a MongoDB con timeout corto para fallback rapido
let dbConnected = false;

try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
    dbConnected = true;
    console.log("Conectado a la base de datos");
} catch (error) {
    console.log("Advertencia: No se pudo conectar a MongoDB Atlas:", error.message);
    console.log("Usando almacenamiento en memoria para sesiones. Para produccion verifica IP whitelist en Atlas.");
}

// Inicializa la configuracion de Passport con estrategias local
initializePassport();

// Configura el manejo de sesiones con almacenamiento persistente
let sessionStore;
if (dbConnected) {
    // Usa MongoStore cuando hay conexion a la base
    sessionStore = MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 60 * 60 * 24,
        collectionName: 'sessions'
    });
    console.log("Sesiones configuradas con MongoStore persistente");
} else {
    // Fallback a MemoryStore si no hay conexion
    console.log("Sesiones configuradas con MemoryStore (no persistente, solo desarrollo)");
}

// Configura el middleware de sesion
app.use(session({
    // Almacena las sesiones en Mongo cuando esta disponible, sino en memoria
    ...(sessionStore && { store: sessionStore }),
    // Clave para firmar la cookie de sesion
    secret: process.env.SESSION_SECRET || 'coderSecretBackendII',
    // No guarda sesion si no hay cambios
    resave: false,
    // No crea sesion vacia hasta que se guarde algo
    saveUninitialized: false,
    // Configuracion de la cookie de sesion
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true
    }
}));

// Inicializa Passport y restaura la sesion de autenticacion
app.use(passport.initialize());
app.use(passport.session());

// Monta las rutas de vistas en la raiz
app.use('/', viewsRouter);

// Monta las rutas de sesiones bajo /api/sessions
app.use('/api/sessions', sessionsRouter);

// Monta las rutas de usuarios existentes
app.use('/api/users', userRouter);

// Ruta de health check para verificar que el servidor responde
app.get('/health', (req, res) => {
    const sessionUser = req.user || req.session.user || null;
    res.send({ status: "ok", session: sessionUser, db: dbConnected ? "connected" : "memory-fallback" });
});

// Ruta de ejemplo protegida que muestra el uso de middleware de autenticacion
app.get('/api/protected', isAuthenticated, (req, res) => {
    const user = req.user || req.session.user;
    res.send({ status: "success", message: "Acceso a ruta protegida", user });
});

// Inicia el servidor en el puerto configurado
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
