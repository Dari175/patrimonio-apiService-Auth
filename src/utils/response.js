/**
 * utils/response.js
 *
 * Helpers para respuestas HTTP uniformes.
 */

const ok = (res, data = {}, status = 200) =>
  res.status(status).json({ ok: true, ...data });

const created = (res, data = {}) => ok(res, data, 201);

const error = (res, mensaje, status = 400, detalles = null) => {
  const body = { ok: false, mensaje };
  if (detalles) body.detalles = detalles;
  return res.status(status).json(body);
};

const unauthorized = (res, mensaje = 'No autorizado') =>
  error(res, mensaje, 401);

const forbidden = (res, mensaje = 'Acceso prohibido') =>
  error(res, mensaje, 403);

const notFound = (res, mensaje = 'Recurso no encontrado') =>
  error(res, mensaje, 404);

const serverError = (res, err) => {
  console.error('❌ Server Error:', err);
  return error(res, 'Error interno del servidor', 500);
};

module.exports = { ok, created, error, unauthorized, forbidden, notFound, serverError };
