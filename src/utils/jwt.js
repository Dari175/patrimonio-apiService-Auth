/**
 * utils/jwt.js
 *
 * Generación y verificación de tokens JWT (access + refresh).
 */

const jwt = require('jsonwebtoken');

const ACCESS_SECRET  = () => process.env.JWT_SECRET;
const REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET;
const ACCESS_EXP     = () => process.env.JWT_EXPIRES_IN         || '8h';
const REFRESH_EXP    = () => process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ─── Access Token ─────────────────────────────────────────────────────────────

function generarAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET(), { expiresIn: ACCESS_EXP() });
}

function verificarAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET());
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

function generarRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET(), { expiresIn: REFRESH_EXP() });
}

function verificarRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET());
}

// ─── Construcción del payload desde un usuario ────────────────────────────────

function buildPayload(user) {
  return {
    sub:    user._id,
    email:  user.email,
    nombre: user.nombre,
    roles:  (user.roles || []).map((r) =>
      typeof r === 'object' ? r.nombre : r
    ),
  };
}

module.exports = {
  generarAccessToken,
  verificarAccessToken,
  generarRefreshToken,
  verificarRefreshToken,
  buildPayload,
};
