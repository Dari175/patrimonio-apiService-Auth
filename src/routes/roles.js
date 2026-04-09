/**
 * routes/roles.js
 */

const { Router } = require('express');
const { body, param } = require('express-validator');
const ctrl = require('../controllers/roleController');
const { autenticar } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(autenticar);

// ── GET /roles ────────────────────────────────────────────────────────────────
router.get('/', ctrl.listar);

// ── GET /roles/:id ────────────────────────────────────────────────────────────
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('ID inválido')],
  validate,
  ctrl.obtener
);

// ── POST /roles ───────────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('nombre')
      .notEmpty().withMessage('El nombre del rol es obligatorio')
      .isLength({ max: 50 }).withMessage('El nombre no puede superar 50 caracteres'),
    body('descripcion').optional().isLength({ max: 200 }),
    body('nivel')
      .isInt({ min: 1, max: 5 })
      .withMessage('El nivel debe estar entre 1 y 5'), // 🔥 IMPORTANTE
  ],
  validate,
  ctrl.crear
);

// ── PUT /roles/:id ────────────────────────────────────────────────────────────
router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('ID inválido'),
    body('descripcion').optional().isLength({ max: 200 }),
    body('nivel')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('El nivel debe estar entre 1 y 5'),
  ],
  validate,
  ctrl.actualizar
);

// ── PATCH /roles/:id/estado ───────────────────────────────────────────────────
router.patch(
  '/:id/estado',
  [
    param('id').isMongoId().withMessage('ID inválido'),
    body('activo').isBoolean().withMessage("'activo' debe ser true o false"),
  ],
  validate,
  ctrl.cambiarEstado
);

module.exports = router;