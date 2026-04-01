/**
 * middleware/auth.js
 *
 * Protección de rutas con JWT Bearer.
 * Extrae el token del header Authorization: Bearer <token>
 */

const { verificarAccessToken }            = require('../utils/jwt');
const { unauthorized, forbidden, serverError } = require('../utils/response');
const User                                = require('../models/User');

// ─── Verifica que el token sea válido y que el usuario esté activo ────────────
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

    // Validar que el usuario siga activo en BD
    const user = await User.findById(decoded.sub).populate('roles', 'nombre activo');

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

    // Adjuntar info al request para uso posterior
    req.usuario = user;
    req.roles   = user.roles.filter((r) => r.activo).map((r) => r.nombre);
    
    next();
  } catch (err) {
    serverError(res, err);
  }
}

// ─── Factory: restringe acceso a uno o varios roles ──────────────────────────
function requiereRol(...rolesPermitidos) {
  return (req, _res, next) => {
    const normalizados = rolesPermitidos.map((r) => r.toUpperCase());
    const tiene        = (req.roles || []).some((r) => normalizados.includes(r));

    if (!tiene) {
      return forbidden(_res, 'No tienes permisos para realizar esta acción');
    }
    next();
  };
}

module.exports = { autenticar, requiereRol };
