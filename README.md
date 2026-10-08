# Backend II

## Cómo correr el proyecto

1. Instala las dependencias:
   - `pnpm install`

2. Crea un archivo `.env` en la raíz con los valores reales (`.env.example` sirve de plantilla). Al menos necesitás:
   - `MONGODB_URI=mongodb://127.0.0.1:27017/backend2` o una URI de MongoDB Atlas.

3. Configurá el envío de mails (recuperación de contraseña):
   - **Opción A — Gmail:** `MAIL_SERVICE=gmail` + `MAIL_USER` y `MAIL_PASS` con una [contraseña de aplicación](https://myaccount.google.com/apppasswords) (requiere verificación en 2 pasos).
   - **Opción B — Mailtrap (desarrollo):** `MAIL_HOST=sandbox.smtp.mailtrap.io`, `MAIL_PORT=2525`, `MAIL_SECURE=false` + `MAIL_USER`/`MAIL_PASS` de tu sandbox de Email Testing. Los mails caen en la bandeja web de [Mailtrap](https://mailtrap.io).

4. Inicia la app:
   - `pnpm start` → servidor en `http://localhost:8080` (chequeo de salud en `/health`).

> Nota: el `.env` se lee al arrancar y no se versiona (está en `.gitignore`). Las variables de entorno se centralizan en `src/config/env.js` con `dotenv`; en producción falla al arrancar si falta algo obligatorio.

## Archivos relevantes

- `src/app.js`: conecta a MongoDB, configura sesiones/Passport y arranca el servidor.
- `src/config/env.js`: centraliza y valida las variables de entorno.
- `.env.example`: plantilla para la configuración local.
- `.env`: archivo local con tus valores reales (no se versiona).


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
- **Manejo de errores de mail con mensajes claros**: `mail.service.js` valida temprano que `MAIL_USER`/`MAIL_PASS` existan, que el correo de recuperación no sea el mismo que la cuenta remitente (Gmail lo rechaza con `535 BadCredentials`) y evita que Nodemailer explote con errores crípticos del estilo "Missing credentials for PLAIN".
- **Flash messages en registro/login**: `middlewares/flash.middleware.js` guarda un mensaje de éxito en la sesión y las vistas lo muestran como banner después de redirigir (antes el "Registro exitoso" se perdía a los 800ms por el redirect).
- **Navegación mejorada en las vistas**: navbar condicional según el estado de sesión y rol (el link de Admin solo aparece para admins), link de "Cerrar sesión" accesible desde todas las vistas protegidas y redirección inteligente en `/` (a `/profile` si ya hay sesión, o a `/login`).
- Limpieza de arquitectura: se eliminó el sistema de JWT manual paralelo (`auth.router.js`, `jwt.middleware.js`, vista `/jwt`) y el router legacy sin protección `routes/user.model.js`, todo consolidado en Passport + la estrategia `current`.

### Variables de entorno nuevas (ver `.env.example`)

| Variable | Uso |
|---|---|
| `COOKIE_SECRET` | Firma la cookie httpOnly `currentToken` (JWT de acceso) |
| `JWT_RESET_SECRET` / `JWT_RESET_EXPIRES_IN` | Token de recuperación de contraseña (secreto propio, expira en 1h) |
| `APP_BASE_URL` | Base para armar el link del botón del mail de reset |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | JWT de acceso que valida la estrategia `current` |
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

### Notas

- La recuperación de contraseña se probó end-to-end con **Mailtrap** (bandeja de Email Testing) y con Gmail; el flujo completo queda: correo → botón → token válido por 1h → nueva contraseña (rechaza la anterior).
- El fallback en memoria (`utils/memoryStore.js`) sigue siendo solo para `User` (pensado para cuando Atlas no está disponible). `Product`/`Cart`/`Ticket` requieren conexión real a MongoDB: sus IDs son ObjectId reales y no tienen fallback.
