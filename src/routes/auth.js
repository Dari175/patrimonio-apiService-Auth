/**
 * routes/auth.js
 */

const { Router }              = require('express');
const { body }                = require('express-validator');
const { login, refresh, logout, me, aceptarAviso, cambiarPassword } = require('../controllers/authController');
const { autenticar }          = require('../middleware/auth');
const { validate }            = require('../middleware/validate');

const router = Router();

// POST /auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('La contraseña es obligatoria'),
  ],
  validate,
  login
);

// POST /auth/refresh
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('refreshToken requerido')],
  validate,
  refresh
);

// POST /auth/logout  (requiere autenticación)
router.post('/logout', autenticar, logout);

// GET /auth/me  (requiere autenticación)
router.get('/me', autenticar, me);

router.post('/aceptar-aviso', autenticar, aceptarAviso);

// POST /auth/cambiar-password  (requiere autenticación)
router.post(
  '/cambiar-password',
  autenticar,
  [
    body('passwordActual').notEmpty().withMessage('La contraseña actual es obligatoria'),
    body('passwordNuevo')
      .isLength({ min: 8 })
      .withMessage('La nueva contraseña debe tener al menos 8 caracteres'),
  ],
  validate,
  cambiarPassword
);

module.exports = router;
