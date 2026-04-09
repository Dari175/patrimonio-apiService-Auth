/**
 * middleware/auth.js
 */

const { verificarAccessToken } = require('../utils/jwt');
const { unauthorized, forbidden, serverError } = require('../utils/response');
const User = require('../models/User');

// ─── AUTENTICAR ──────────────────────────────────────────────────────────────
async function autenticar(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'Token de acceso no proporcionado');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = verificarAccessToken(token);
    } catch (err) {
      const msg =
        err.name === 'TokenExpiredError'
          ? 'El token ha expirado'
          : 'Token inválido';
      return unauthorized(res, msg);
    }

    const user = await User.findById(decoded.sub)
      .populate('roles', 'nombre activo nivel');

    if (!user) {
      return unauthorized(res, 'Usuario no encontrado');
    }

    const rutasPermitidas = [
      '/aceptar-aviso',
      '/me',
      '/logout',
      '/cambiar-password'
    ];

    if (
      !user.avisoPrivacidadAceptado &&
      !rutasPermitidas.some(ruta => req.originalUrl.includes(ruta))
    ) {
      return forbidden(res, 'Debes aceptar el aviso de privacidad');
    }

    //  Roles activos
    const rolesActivos = user.roles.filter(r => r.activo);

    //  Nivel máximo del usuario
    const niveles = rolesActivos.map(r => r.nivel || 0);
    const minNivel = niveles.length ? Math.min(...niveles) : 0;

    // Adjuntar info al request
    req.usuario = user;
    req.roles = rolesActivos.map(r => r.nombre);
    req.nivel = minNivel; // 🔥 CLAVE

    next();
  } catch (err) {
    serverError(res, err);
  }
}


// ─── NUEVO: REQUIERE NIVEL (PRO) ─────────────────────────────────────────────
function requiereNivel(nivelMinimo) {
  return (req, res, next) => {
    if ((req.nivel || 0) < nivelMinimo) {
      return forbidden(res, 'No tienes permisos para realizar esta acción');
    }
    next();
  };
}


// ─── OPCIONAL: mantener compatibilidad con roles ─────────────────────────────
function requiereRol(...rolesPermitidos) {
  return (req, res, next) => {
    const rolesUsuario = req.roles || [];

    // 🔥 ADMIN (o el rol con mayor nivel) siempre pasa
    if ((req.nivel || 0) >= 100) {
      return next();
    }

    const normalizados = rolesPermitidos.map(r => r.toUpperCase());
    const tiene = rolesUsuario.some(r => normalizados.includes(r));

    if (!tiene) {
      return forbidden(res, 'No tienes permisos para realizar esta acción');
    }

    next();
  };
}


module.exports = { autenticar, requiereRol, requiereNivel };