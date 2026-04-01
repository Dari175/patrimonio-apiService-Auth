/**
 * controllers/authController.js
 *
 * Login, Refresh Token, Logout, Me.
 */

const User                             = require('../models/User');
const { generarAccessToken, generarRefreshToken,
        verificarRefreshToken, buildPayload } = require('../utils/jwt');
const { ok, unauthorized, error, serverError } = require('../utils/response');

// ─── POST /auth/login ─────────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Traer usuario con password (select: false en el schema)
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password +refreshTokens')
      .populate('roles', 'nombre activo');

    if (!user) return unauthorized(res, 'Credenciales incorrectas');
    if (user.estado !== 'ALTA') return unauthorized(res, 'Cuenta inactiva');

    const passwordOk = await user.compararPassword(password);
    if (!passwordOk) return unauthorized(res, 'Credenciales incorrectas');

    // Filtrar solo roles activos
    const rolesActivos = user.roles.filter((r) => r.activo);

    const payload      = buildPayload({ ...user.toObject(), roles: rolesActivos });
    const accessToken  = generarAccessToken(payload);
    const refreshToken = generarRefreshToken({ sub: user._id });

    // Guardar refresh token (multi-dispositivo: se acumulan, máx 5)
    user.refreshTokens = [...(user.refreshTokens || []), refreshToken].slice(-5);
    user.ultimoAcceso  = new Date();
    await user.save();

    return ok(res, {
      mensaje: 'Sesión iniciada',
      accessToken,
      refreshToken,
      usuario: user.toPublic(),
    });
  } catch (err) {
    serverError(res, err);
  }
}

// ─── POST /auth/refresh ───────────────────────────────────────────────────────
async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return unauthorized(res, 'Refresh token no proporcionado');

    let decoded;
    try {
      decoded = verificarRefreshToken(refreshToken);
    } catch {
      return unauthorized(res, 'Refresh token inválido o expirado');
    }

    const user = await User.findById(decoded.sub)
      .select('+refreshTokens')
      .populate('roles', 'nombre activo');

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return unauthorized(res, 'Refresh token revocado');
    }
    if (user.estado !== 'ALTA') return unauthorized(res, 'Cuenta inactiva');

    const rolesActivos = user.roles.filter((r) => r.activo);
    const payload      = buildPayload({ ...user.toObject(), roles: rolesActivos });
    const newAccess    = generarAccessToken(payload);
    const newRefresh   = generarRefreshToken({ sub: user._id });

    // Rotar refresh token
    user.refreshTokens = user.refreshTokens
      .filter((t) => t !== refreshToken)
      .concat(newRefresh)
      .slice(-5);
    await user.save();

    return ok(res, { accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) {
    serverError(res, err);
  }
}

// ─── POST /auth/logout ────────────────────────────────────────────────────────
async function logout(req, res) {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById(req.usuario._id).select('+refreshTokens');

    if (user && refreshToken) {
      user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
      await user.save();
    }

    return ok(res, { mensaje: 'Sesión cerrada correctamente' });
  } catch (err) {
    serverError(res, err);
  }
}

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
async function me(req, res) {
  try {
    const user = await User.findById(req.usuario._id).populate('roles', 'nombre descripcion');
    return ok(res, { usuario: user.toPublic() });
  } catch (err) {
    serverError(res, err);
  }
}

async function aceptarAviso(req, res) {
  try {
    const user = await User.findById(req.usuario._id);

    if (!user) return unauthorized(res, 'Usuario no encontrado');

    user.avisoPrivacidadAceptado = true;
    user.fechaAceptacionAviso = new Date();

    await user.save();

    return ok(res, {
      mensaje: 'Aviso de privacidad aceptado'
    });

  } catch (err) {
    serverError(res, err);
  }
}

// ─── POST /auth/cambiar-password ──────────────────────────────────────────────
async function cambiarPassword(req, res) {
  try {
    const { passwordActual, passwordNuevo } = req.body;

    // Traer usuario con password (select: false en el schema)
    const user = await User.findById(req.usuario._id).select('+password');
    if (!user) return unauthorized(res, 'Usuario no encontrado');

    // Verificar que la contraseña actual sea correcta
    const passwordOk = await user.compararPassword(passwordActual);
    if (!passwordOk) return unauthorized(res, 'La contraseña actual es incorrecta');

    // Verificar que la nueva no sea igual a la actual
    const esMismaPassword = await user.compararPassword(passwordNuevo);
    if (esMismaPassword) {
      return error(res, 'La nueva contraseña no puede ser igual a la actual', 400);
    }

    // El pre-save hook de bcrypt hashea automáticamente
    user.password = passwordNuevo;
    user.requiereCambioPassword = false;   // ← NUEVO
    await user.save();

    return ok(res, { mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    serverError(res, err);
  }
}

module.exports = { login, refresh, logout, me, aceptarAviso, cambiarPassword };
