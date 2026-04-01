# 🔐 Auth Service — Microservicio de Autenticación y Gestión de Usuarios

Microservicio REST construido con **Node.js + Express + MongoDB**.  
Gestión de usuarios con roles dinámicos, protección JWT Bearer y control de estado ALTA/BAJA (sin eliminaciones).

---

## 📁 Estructura del proyecto

```
auth-service/
├── scripts/
│   └── seed.js                  # Carga roles iniciales y usuario admin
├── src/
│   ├── config/
│   │   └── database.js          # Conexión dual: Local (sin SRV) o Atlas
│   ├── controllers/
│   │   ├── authController.js    # Login, Refresh, Logout, Me
│   │   ├── userController.js    # CRUD usuarios + gestión de estado/roles
│   │   └── roleController.js    # CRUD roles + activar/desactivar
│   ├── middleware/
│   │   ├── auth.js              # JWT Bearer + guard de roles
│   │   └── validate.js          # express-validator handler
│   ├── models/
│   │   ├── User.js
│   │   └── Role.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── usuarios.js
│   │   └── roles.js
│   ├── utils/
│   │   ├── jwt.js               # Access + Refresh tokens
│   │   └── response.js          # Helpers de respuesta HTTP
│   └── app.js                   # Entry point
├── .env.example
├── .gitignore
└── package.json
```

---

## ⚙️ Instalación

```bash
# 1. Clonar / descomprimir el proyecto
cd auth-service

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores
```

---

## 🔌 Conexión a MongoDB

El servicio soporta **dos modos** controlados por `NODE_ENV` en `.env`:

### Modo LOCAL (sin SRV)
```env
NODE_ENV=local

MONGO_LOCAL_HOST=localhost
MONGO_LOCAL_PORT=27017
MONGO_LOCAL_DB=auth_service
MONGO_LOCAL_USER=          # dejar vacío si no hay autenticación
MONGO_LOCAL_PASS=
```
Genera internamente: `mongodb://localhost:27017/auth_service`  
No usa `mongodb+srv://` ni DNS seedlist — compatible con instalaciones locales sin resolución SRV.

### Modo ATLAS
```env
NODE_ENV=atlas
MONGO_ATLAS_URI=mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/auth_service?retryWrites=true&w=majority
```

---

## 🌱 Seed inicial

Ejecutar **una sola vez** para crear los roles base y el primer usuario Director:

```bash
node scripts/seed.js
```

Crea automáticamente:
- Roles: `DIRECTOR`, `COORDINADOR`, `AUXILIAR_ADMINISTRATIVO`
- Usuario admin con las credenciales de `.env` (`SEED_ADMIN_*`)

> ⚠️ Cambia la contraseña del admin después del primer login.

---

## 🚀 Arranque

```bash
# Producción
npm start

# Desarrollo (hot-reload)
npm run dev
```

---

## 🔑 Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NODE_ENV` | Modo de conexión | `local` \| `atlas` |
| `PORT` | Puerto del servidor | `3000` |
| `MONGO_LOCAL_HOST` | Host MongoDB local | `localhost` |
| `MONGO_LOCAL_PORT` | Puerto MongoDB local | `27017` |
| `MONGO_LOCAL_DB` | Nombre de la BD local | `auth_service` |
| `MONGO_LOCAL_USER` | Usuario local (opcional) | |
| `MONGO_LOCAL_PASS` | Contraseña local (opcional) | |
| `MONGO_ATLAS_URI` | URI completo de Atlas | `mongodb+srv://...` |
| `JWT_SECRET` | Secreto del access token | cadena larga y aleatoria |
| `JWT_EXPIRES_IN` | Expiración access token | `8h` |
| `JWT_REFRESH_SECRET` | Secreto del refresh token | cadena larga y aleatoria |
| `JWT_REFRESH_EXPIRES_IN` | Expiración refresh token | `7d` |
| `BCRYPT_SALT_ROUNDS` | Rondas de hash | `12` |
| `SEED_ADMIN_NAME` | Nombre del admin inicial | `Administrador` |
| `SEED_ADMIN_EMAIL` | Email del admin inicial | `admin@empresa.com` |
| `SEED_ADMIN_PASSWORD` | Contraseña del admin inicial | `Admin123!` |

---

## 📡 API Reference

Todos los endpoints protegidos requieren el header:
```
Authorization: Bearer <accessToken>
```

### 🔓 Auth  `/auth`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/auth/login` | Público | Iniciar sesión |
| POST | `/auth/refresh` | Público | Renovar tokens |
| POST | `/auth/logout` | Autenticado | Cerrar sesión |
| GET | `/auth/me` | Autenticado | Datos del usuario actual |

#### POST `/auth/login`
```json
// Request
{ "email": "admin@empresa.com", "password": "Admin123!" }

// Response 200
{
  "ok": true,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "usuario": { ... }
}
```

#### POST `/auth/refresh`
```json
// Request
{ "refreshToken": "eyJ..." }

// Response 200
{ "ok": true, "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

#### POST `/auth/logout`
```json
// Request (body opcional para revocar el refresh token)
{ "refreshToken": "eyJ..." }
```

---

### 👥 Usuarios  `/usuarios`

| Método | Ruta | Roles permitidos | Descripción |
|---|---|---|---|
| GET | `/usuarios` | DIRECTOR, COORDINADOR | Listar usuarios |
| GET | `/usuarios/:id` | DIRECTOR, COORDINADOR | Obtener usuario |
| POST | `/usuarios` | DIRECTOR | Crear usuario |
| PUT | `/usuarios/:id` | DIRECTOR | Actualizar usuario |
| PATCH | `/usuarios/:id/estado` | DIRECTOR | Dar de alta o baja |
| PATCH | `/usuarios/:id/roles` | DIRECTOR, COORDINADOR | Agregar/quitar roles |

#### GET `/usuarios`  — Query params opcionales
```
?estado=ALTA|BAJA
?rol=COORDINADOR
?pagina=1&limite=20
```

#### POST `/usuarios`
```json
{
  "nombre": "María López",
  "apellidos": "García",
  "email": "maria@empresa.com",
  "password": "Segura123!",
  "roles": ["<roleId>", "<roleId>"]   // opcional
}
```

#### PATCH `/usuarios/:id/estado`  — Alta / Baja (sin eliminar)
```json
{ "estado": "BAJA", "motivo": "Término de contrato" }
{ "estado": "ALTA", "motivo": "Reincorporación" }
```

#### PATCH `/usuarios/:id/roles`  — Gestión granular de roles
```json
// Agregar roles
{ "accion": "agregar", "roles": ["<roleId>"] }

// Quitar roles
{ "accion": "quitar", "roles": ["<roleId>"] }
```

---

### 🏷️ Roles  `/roles`

| Método | Ruta | Roles permitidos | Descripción |
|---|---|---|---|
| GET | `/roles` | Cualquier autenticado | Listar roles |
| GET | `/roles/:id` | Cualquier autenticado | Obtener rol |
| POST | `/roles` | DIRECTOR | Crear rol |
| PUT | `/roles/:id` | DIRECTOR | Actualizar descripción |
| PATCH | `/roles/:id/estado` | DIRECTOR | Activar / desactivar rol |

#### GET `/roles`  — Query params
```
?activo=true|false
```

#### POST `/roles`
```json
{ "nombre": "SUPERVISOR", "descripcion": "Supervisión de operaciones" }
```

#### PATCH `/roles/:id/estado`  — Activar / Desactivar (sin eliminar)
```json
{ "activo": false }   // Desactivar
{ "activo": true }    // Reactivar
```
> ⚠️ No se puede desactivar un rol si hay usuarios activos que lo tienen asignado.

---

## 🛡️ Modelo de seguridad

- **Contraseñas** hasheadas con bcrypt (12 rondas por defecto)
- **Access Token** JWT firmado — duración corta (8h por defecto)
- **Refresh Token** JWT firmado con secreto distinto — duración larga (7d), rotación en cada uso
- **Multi-dispositivo**: hasta 5 refresh tokens activos por usuario
- **Bearer Token** requerido en todos los endpoints protegidos
- **Roles** verificados en cada request desde la BD (no solo desde el token)

## 📌 Reglas de negocio clave

| Regla | Detalle |
|---|---|
| Sin eliminaciones | Usuarios y roles nunca se borran; se gestionan estados |
| Estado usuario | `ALTA` (activo) / `BAJA` (inactivo) con historial completo |
| Estado rol | `activo: true/false` — no se puede desactivar si hay usuarios activos con él |
| Roles dinámicos | Se crean y desactivan en tiempo de ejecución |
| Nombres de rol | Se guardan en MAYÚSCULAS automáticamente |

---

## 🩺 Health Check

```
GET /health
→ { "ok": true, "entorno": "local", "ts": "2024-..." }
```
