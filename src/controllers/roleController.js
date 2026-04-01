/**
 * controllers/roleController.js
 *
 * CRUD de roles.
 * Los roles no se eliminan: se activan/desactivan (ALTA/BAJA).
 */

const Role = require('../models/Role');
const User = require('../models/User');
const { ok, created, error, notFound, serverError }  = require('../utils/response');

// ─── GET /roles ───────────────────────────────────────────────────────────────
async function listar(req, res) {
  try {
    const { activo } = req.query;
    const filtro = {};

    if (activo !== undefined) filtro.activo = activo === 'true';

    const roles = await Role.find(filtro)
      .populate('modificadoPor', 'nombre email')
      .sort({ nombre: 1 });

    return ok(res, { total: roles.length, roles });
  } catch (err) {
    serverError(res, err);
  }
}

// ─── GET /roles/:id ───────────────────────────────────────────────────────────
async function obtener(req, res) {
  try {
    const rol = await Role.findById(req.params.id).populate('modificadoPor', 'nombre email');
    if (!rol) return notFound(res, 'Rol no encontrado');
    return ok(res, { rol });
  } catch (err) {
    serverError(res, err);
  }
}

// ─── POST /roles ──────────────────────────────────────────────────────────────
async function crear(req, res) {
  try {
    const { nombre, descripcion } = req.body;

    const existe = await Role.findOne({ nombre: nombre.toUpperCase() });
    if (existe) {
      // Si existe pero está inactivo, informar
      if (!existe.activo) {
        return error(
          res,
          `El rol '${nombre.toUpperCase()}' ya existe pero está inactivo. Puedes reactivarlo en lugar de crear uno nuevo.`,
          409
        );
      }
      return error(res, `El rol '${nombre.toUpperCase()}' ya existe`, 409);
    }

    const rol = await Role.create({
      nombre:       nombre.toUpperCase(),
      descripcion,
      modificadoPor: req.usuario._id,
    });

    return created(res, { mensaje: 'Rol creado', rol });
  } catch (err) {
    serverError(res, err);
  }
}

// ─── PUT /roles/:id ───────────────────────────────────────────────────────────
async function actualizar(req, res) {
  try {
    const { descripcion } = req.body;
    // Solo se permite actualizar la descripción; el nombre es inmutable para preservar integridad

    const rol = await Role.findById(req.params.id);
    if (!rol) return notFound(res, 'Rol no encontrado');

    if (descripcion !== undefined) rol.descripcion = descripcion;
    rol.modificadoPor = req.usuario._id;

    await rol.save();
    return ok(res, { mensaje: 'Rol actualizado', rol });
  } catch (err) {
    serverError(res, err);
  }
}

// ─── PATCH /roles/:id/estado ──────────────────────────────────────────────────
// Activa o desactiva un rol (no elimina)
async function cambiarEstado(req, res) {
  try {
    const { activo } = req.body;
    if (typeof activo !== 'boolean') {
      return error(res, "El campo 'activo' debe ser true o false");
    }

    const rol = await Role.findById(req.params.id);
    if (!rol) return notFound(res, 'Rol no encontrado');

    if (rol.activo === activo) {
      return error(res, `El rol ya está ${activo ? 'activo' : 'inactivo'}`);
    }

    // Si se desactiva, verificar cuántos usuarios lo usan
    if (!activo) {
      const usuariosAfectados = await User.countDocuments({ roles: rol._id, estado: 'ALTA' });
      if (usuariosAfectados > 0) {
        return error(
          res,
          `No se puede desactivar: ${usuariosAfectados} usuario(s) activo(s) tienen este rol asignado`,
          409
        );
      }
    }

    rol.activo        = activo;
    rol.modificadoPor = req.usuario._id;
    await rol.save();

    return ok(res, {
      mensaje: `Rol ${activo ? 'activado' : 'desactivado'}`,
      rol,
    });
  } catch (err) {
    serverError(res, err);
  }
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado };
