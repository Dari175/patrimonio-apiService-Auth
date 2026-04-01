/**
 * controllers/userController.js
 *
 * CRUD de usuarios.
 * NUNCA se eliminan registros: se gestiona estado ALTA / BAJA.
 */

const User                                           = require('../models/User');
const Role                                           = require('../models/Role');
const { ok, created, error, notFound, serverError }  = require('../utils/response');

// ─── GET /usuarios ────────────────────────────────────────────────────────────
async function listar(req, res) {
  try {
    const { estado, rol, pagina = 1, limite = 20 } = req.query;
    const filtro = {};

    if (estado) filtro.estado = estado.toUpperCase();

    if (rol) {
      const roleDoc = await Role.findOne({ nombre: rol.toUpperCase() });
      if (!roleDoc) return notFound(res, `Rol '${rol}' no encontrado`);
      filtro.roles = roleDoc._id;
    }

    const skip   = (parseInt(pagina) - 1) * parseInt(limite);
    const total  = await User.countDocuments(filtro);
    const users  = await User.find(filtro)
      .populate('roles', 'nombre descripcion activo')
      .populate('creadoPor', 'nombre email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limite));

    return ok(res, {
      total,
      pagina: parseInt(pagina),
      limite: parseInt(limite),
      usuarios: users.map((u) => u.toPublic()),
    });
  } catch (err) {
    serverError(res, err);
  }
}

// ─── GET /usuarios/:id ────────────────────────────────────────────────────────
async function obtener(req, res) {
  try {
    const user = await User.findById(req.params.id)
      .populate('roles', 'nombre descripcion activo')
      .populate('creadoPor', 'nombre email')
      .populate('historialEstado.realizadoPor', 'nombre email');

    if (!user) return notFound(res, 'Usuario no encontrado');
    return ok(res, { usuario: user.toPublic() });
  } catch (err) {
    serverError(res, err);
  }
}

// ─── POST /usuarios ───────────────────────────────────────────────────────────
async function crear(req, res) {
  try {
    const { nombre, apellidos, email, password, roles: rolesIds = [] } = req.body;

    // Verificar email único
    const existe = await User.findOne({ email: email.toLowerCase() });
    if (existe) return error(res, 'El email ya está registrado', 409);

    // Validar roles proporcionados
    let rolesValidos = [];
    if (rolesIds.length > 0) {
      rolesValidos = await Role.find({ _id: { $in: rolesIds }, activo: true });
      if (rolesValidos.length !== rolesIds.length) {
        return error(res, 'Uno o más roles son inválidos o están inactivos');
      }
    }

    const user = await User.create({
      nombre,
      apellidos,
      email,
      password,
      roles:     rolesValidos.map((r) => r._id),
      creadoPor: req.usuario._id,
      historialEstado: [
        { estado: 'ALTA', realizadoPor: req.usuario._id, motivo: 'Registro inicial' },
      ],
    });

    const populated = await User.findById(user._id).populate('roles', 'nombre descripcion');
    return created(res, { mensaje: 'Usuario creado', usuario: populated.toPublic() });
  } catch (err) {
    serverError(res, err);
  }
}

// ─── PUT /usuarios/:id ────────────────────────────────────────────────────────
async function actualizar(req, res) {
  try {
    const { nombre, apellidos, email, password, roles: rolesIds } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res, 'Usuario no encontrado');

    if (nombre)    user.nombre    = nombre;
    if (apellidos !== undefined) user.apellidos = apellidos;

    if (email && email.toLowerCase() !== user.email) {
      const existe = await User.findOne({ email: email.toLowerCase() });
      if (existe) return error(res, 'El email ya está en uso', 409);
      user.email = email.toLowerCase();
    }

    if (password) user.password = password;   // Pre-save hook hashea

    if (rolesIds !== undefined) {
      if (rolesIds.length > 0) {
        const rolesValidos = await Role.find({ _id: { $in: rolesIds }, activo: true });
        if (rolesValidos.length !== rolesIds.length) {
          return error(res, 'Uno o más roles son inválidos o están inactivos');
        }
        user.roles = rolesValidos.map((r) => r._id);
      } else {
        user.roles = [];
      }
    }

    await user.save();
    const populated = await User.findById(user._id).populate('roles', 'nombre descripcion');
    return ok(res, { mensaje: 'Usuario actualizado', usuario: populated.toPublic() });
  } catch (err) {
    serverError(res, err);
  }
}

// ─── PATCH /usuarios/:id/estado ───────────────────────────────────────────────
// Da de alta o de baja al usuario (NO lo elimina)
async function cambiarEstado(req, res) {
  try {
    const { estado, motivo = '' } = req.body;
    const nuevoEstado = estado?.toUpperCase();

    if (!['ALTA', 'BAJA'].includes(nuevoEstado)) {
      return error(res, "El estado debe ser 'ALTA' o 'BAJA'");
    }

    const user = await User.findById(req.params.id);
    if (!user) return notFound(res, 'Usuario no encontrado');

    if (user.estado === nuevoEstado) {
      return error(res, `El usuario ya se encuentra en estado ${nuevoEstado}`);
    }

    user.estado = nuevoEstado;
    user.historialEstado.push({
      estado:       nuevoEstado,
      fecha:        new Date(),
      realizadoPor: req.usuario._id,
      motivo,
    });

    await user.save();
    return ok(res, {
      mensaje: `Usuario dado de ${nuevoEstado === 'ALTA' ? 'alta' : 'baja'}`,
      usuario: user.toPublic(),
    });
  } catch (err) {
    serverError(res, err);
  }
}

// ─── PATCH /usuarios/:id/roles ────────────────────────────────────────────────
// Agregar o quitar roles específicos sin reemplazar la lista completa
async function gestionarRoles(req, res) {
  try {
    const { accion, roles: rolesIds } = req.body; // accion: "agregar" | "quitar"

    if (!['agregar', 'quitar'].includes(accion)) {
      return error(res, "La acción debe ser 'agregar' o 'quitar'");
    }
    if (!Array.isArray(rolesIds) || rolesIds.length === 0) {
      return error(res, 'Debes proporcionar al menos un rol');
    }

    const user = await User.findById(req.params.id);
    if (!user) return notFound(res, 'Usuario no encontrado');

    const rolesDB = await Role.find({ _id: { $in: rolesIds } });
    if (rolesDB.length !== rolesIds.length) {
      return error(res, 'Uno o más roles no existen');
    }

    const idsActuales = user.roles.map((r) => r.toString());
    const idsNuevos   = rolesIds.map((r) => r.toString());

    if (accion === 'agregar') {
      // Verificar que estén activos
      const inactivos = rolesDB.filter((r) => !r.activo);
      if (inactivos.length > 0) {
        return error(res, `Roles inactivos: ${inactivos.map((r) => r.nombre).join(', ')}`);
      }
      const sinDuplicados = [...new Set([...idsActuales, ...idsNuevos])];
      user.roles = sinDuplicados;
    } else {
      user.roles = idsActuales.filter((id) => !idsNuevos.includes(id));
    }

    await user.save();
    const populated = await User.findById(user._id).populate('roles', 'nombre descripcion activo');
    return ok(res, {
      mensaje: `Roles ${accion === 'agregar' ? 'agregados' : 'removidos'} correctamente`,
      usuario: populated.toPublic(),
    });
  } catch (err) {
    serverError(res, err);
  }
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, gestionarRoles };
