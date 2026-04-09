const { Router } = require('express');
const { body, param } = require('express-validator');
const ctrl = require('../controllers/userController');
const { autenticar } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(autenticar);

// TODO abierto para usuarios autenticados
router.get('/', ctrl.listar);

router.get('/:id',
  [param('id').isMongoId().withMessage('ID inválido')],
  validate,
  ctrl.obtener
);

router.post('/',
  [
    body('nombre').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
  ],
  validate,
  ctrl.crear
);

router.put('/:id',
  [
    param('id').isMongoId(),
    body('email').optional().isEmail(),
  ],
  validate,
  ctrl.actualizar
);

router.patch('/:id/estado',
  [
    param('id').isMongoId(),
    body('estado').isIn(['ALTA', 'BAJA']),
  ],
  validate,
  ctrl.cambiarEstado
);

router.patch('/:id/roles',
  [
    param('id').isMongoId(),
    body('accion').isIn(['agregar', 'quitar']),
    body('roles').isArray({ min: 1 }),
  ],
  validate,
  ctrl.gestionarRoles
);

module.exports = router;