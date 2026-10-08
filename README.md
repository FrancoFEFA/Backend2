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
- **Arquitectura por capas (DAO + Repository + DTO)**: se eliminó el acceso directo a Mongoose desde routers/passport. Ahora todo pasa por `dao/` (persistencia cruda, con el fallback a memoria para usuarios) → `repositories/` (reglas de negocio: duplicados, stock, hash de contraseñas) → `controllers/` → `routes/`.
- **Estrategia Passport `current`** (`passport-jwt`): valida el JWT de acceso guardado en la cookie httpOnly firmada `currentToken` y relee el usuario desde la base en cada request (un cambio de rol o un borrado de cuenta invalida el acceso al instante). Protege toda la API JSON (`/api/sessions/current`, `/api/products`, `/api/carts`). Las vistas Handlebars (`/profile`, `/admin`, `/current`) siguen usando la sesión de Passport como antes.
- **DTO en `/current`**: `dto/user.dto.js` arma el `CurrentUserDTO` (`id`, `first_name`, `last_name`, `email`, `age`, `role`). Nunca se devuelve `password`, `githubId`, `__v` ni el documento crudo.
- **Recuperación de contraseña** (Nodemailer): `POST /api/sessions/forgot-password` envía un mail con un botón que linkea a `/reset-password?token=...`. El token es un JWT de un solo propósito, secreto propio (`JWT_RESET_SECRET`) y expira a la hora. Además embebe un "snapshot" del hash de la contraseña actual: si ya se usó una vez (o la contraseña cambió de cualquier otra forma), el link queda invalidado aunque todavía no haya expirado. `POST /api/sessions/reset-password` rechaza explícitamente que la nueva contraseña sea igual a la anterior.
- **Middlewares de autorización por rol** (`isAdmin`, `isUser`) trabajando junto a la estrategia `current`: solo `admin` puede crear/editar/borrar productos (`/api/products`); solo `user` puede operar su carrito y comprar (`/api/carts`). Un admin no tiene carrito en este modelo.
- **Módulo de Productos y Carrito nuevo** (`Product`, `Cart`, `Ticket`): catálogo público de lectura, mutación solo-admin; carrito persistido por usuario (uno por cuenta); `POST /api/carts/purchase` valida stock en tiempo real, genera un `Ticket` (snapshot de precios/cantidades) y deja en el carrito, sin perderlos, los productos que se quedaron sin stock (compra parcial).
- **Manejo de variables de entorno centralizado** en `config/env.js`: falla al arrancar si falta algo obligatorio en producción, valores por defecto solo en desarrollo.
- Limpieza de arquitectura: se eliminó el sistema de JWT manual paralelo (`auth.router.js`, `jwt.middleware.js`, vista `/jwt`) y el router legacy sin protección `routes/user.model.js`, todo consolidado en Passport + la estrategia `current`.

### Variables de entorno nuevas (ver `.env.example`)

| Variable | Uso |
|---|---|
| `COOKIE_SECRET` | Firma la cookie httpOnly `currentToken` (JWT de acceso) |
| `JWT_RESET_SECRET` / `JWT_RESET_EXPIRES_IN` | Token de recuperación de contraseña (secreto propio, expira en 1h) |
| `APP_BASE_URL` | Base para armar el link del botón del mail de reset |
| `MAIL_SERVICE` / `MAIL_USER` / `MAIL_PASS` / `MAIL_FROM` | Credenciales de Nodemailer (por defecto Gmail con contraseña de aplicación) |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_SECURE` | Alternativa SMTP propia (ej. Mailtrap) en vez de `MAIL_SERVICE` |

### Endpoints nuevos

| Método | Ruta | Acceso |
|---|---|---|
| `POST` | `/api/sessions/forgot-password` | Público |
| `POST` | `/api/sessions/reset-password` | Público (requiere token válido) |
| `GET` | `/api/products`, `/api/products/:pid` | Público |
| `POST`/`PUT`/`DELETE` | `/api/products[/:pid]` | Solo `admin` |
| `GET`/`POST`/`PUT`/`DELETE` | `/api/carts[...]` | Solo `user` |
| `POST` | `/api/carts/purchase` | Solo `user` |

### Pendiente / a tu cargo

- Completar `MAIL_USER`/`MAIL_PASS` en `.env` con una [contraseña de aplicación de Gmail](https://myaccount.google.com/apppasswords) (o las credenciales de tu proveedor SMTP) para que el mail de recuperación se envíe de verdad.
- El fallback en memoria (`utils/memoryStore.js`) sigue siendo solo para `User` (pensado para cuando Atlas no está disponible). `Product`/`Cart`/`Ticket` requieren conexión real a MongoDB: sus IDs son ObjectId reales y no tienen fallback.
