/**
 * middleware/validate.js
 *
 * Ejecuta express-validator y responde con los errores si los hay.
 */

const { validationResult } = require('express-validator');
const { error }            = require('../utils/response');

function validate(req, res, next) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return error(res, 'Error de validación', 422, errores.array());
  }
  next();
}

module.exports = { validate };
