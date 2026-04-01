/**
 * routes/usuarios.js
 */

const { Router }    = require('express');
const { body, param } = require('express-validator');
const ctrl          = require('../controllers/userController');
const { autenticar, requiereRol } = require('../middleware/auth');
const { validate }  = require('../middleware/validate');

const router = Router();

// Todas las rutas requieren autenticación
router.use(autenticar);

// ── GET /usuarios ─────────────────────────────────────────────────────────────
router.get('/', requiereRol('DIRECTOR', 'COORDINADOR'), ctrl.listar);

// ── GET /usuarios/:id ─────────────────────────────────────────────────────────
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('ID inválido')],
  validate,
  requiereRol('DIRECTOR', 'COORDINADOR'),
  ctrl.obtener
);

// ── POST /usuarios ────────────────────────────────────────────────────────────
router.post(
  '/',
  requiereRol('DIRECTOR'),
  [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres'),
    body('roles').optional().isArray().withMessage('Los roles deben ser un arreglo'),
  ],
  validate,
  ctrl.crear
);

// ── PUT /usuarios/:id ─────────────────────────────────────────────────────────
router.put(
  '/:id',
  requiereRol('DIRECTOR'),
  [
    param('id').isMongoId().withMessage('ID inválido'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('password').optional().isLength({ min: 8 }).withMessage('Mínimo 8 caracteres'),
  ],
  validate,
  ctrl.actualizar
);

// ── PATCH /usuarios/:id/estado ────────────────────────────────────────────────
router.patch(
  '/:id/estado',
  requiereRol('DIRECTOR'),
  [
    param('id').isMongoId().withMessage('ID inválido'),
    body('estado')
      .isIn(['ALTA', 'BAJA', 'alta', 'baja'])
      .withMessage("El estado debe ser 'ALTA' o 'BAJA'"),
  ],
  validate,
  ctrl.cambiarEstado
);

// ── PATCH /usuarios/:id/roles ─────────────────────────────────────────────────
router.patch(
  '/:id/roles',
  requiereRol('DIRECTOR', 'COORDINADOR'),
  [
    param('id').isMongoId().withMessage('ID inválido'),
    body('accion')
      .isIn(['agregar', 'quitar'])
      .withMessage("La acción debe ser 'agregar' o 'quitar'"),
    body('roles')
      .isArray({ min: 1 })
      .withMessage('Debes proporcionar al menos un rol'),
    body('roles.*').isMongoId().withMessage('ID de rol inválido'),
  ],
  validate,
  ctrl.gestionarRoles
);

module.exports = router;
