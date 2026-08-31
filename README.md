# Backend II

## Configuración de MongoDB

1. Instala dependencias:
   - `pnpm install`

2. Crea un archivo `.env`  o usa el archivo ya creado en la raíz del proyecto.

3. Define la URL de conexión:
   - `MONGODB_URI=mongodb://127.0.0.1:27017/backend2`
   - o una URI de MongoDB Atlas, por ejemplo:
     `mongodb+srv://usuario:password@cluster.../?appName=Cluster0`

4. Inicia la app:
   - `pnpm start`

## Notas sobre pnpm y npm

- `pnpm` no cambia la forma en que MongoDB se conecta; lo que cambia la forma en que se cargan las variables de entorno
- La app usa `dotenv` para leer `.env` desde `src/app.js`.
- En este entorno, `pnpm` resolvió la instalación de `dotenv` de forma más limpia que `npm`, por eso el arranque funcionó después de usarlo.
- Si ya tienes `dotenv` instalado, `npm start` también podría funcionar; el punto clave es que el archivo `.env` exista y que `MONGODB_URI` sea válido.

## Archivos relevantes

- `src/app.js`: conecta a MongoDB y arranca el servidor.
- `.env.example`: plantilla para la configuración local.
- `.env`: archivo local con tus valores reales (no se debe versionar).


## Update de mi para mi:

- Configuración base Express + Mongoose + dotenv y conexión a MongoDB Atlas con fallback MemoryStore
- CRUD inicial de usuarios (GET/POST/PUT/DELETE /api/users) 
- Sistema de Login con Sesiones: sessions.router manual con bcrypt (createHash/isValidPassword), POST /register|/login, GET /current|/logout, + formularios views/login|register.handlebars
- Middlewares de protección: isAuthenticated / isNotAuthenticated y authorizeRoles("admin") para rutas /profile, /admin
- Vistas protegidas Handlebars profile/admin/current con layout y manejo API Current JSON vs HTML
- Migración total a Passport-Local completada · Contraseñas protegidas con bcrypt y autenticación centralizada.
