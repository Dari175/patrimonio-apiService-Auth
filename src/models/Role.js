/**
 * models/Role.js
 *
 * Roles dinámicos: se pueden crear y desactivar en tiempo de ejecución.
 * Jamás se eliminan registros; se maneja estado ACTIVO / INACTIVO.
 */

const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del rol es obligatorio'],
      unique: true,
      trim: true,
      uppercase: true,          // Se guarda en mayúsculas para uniformidad
      maxlength: [50, 'El nombre no puede superar 50 caracteres'],
    },

    descripcion: {
      type: String,
      trim: true,
      maxlength: [200, 'La descripción no puede superar 200 caracteres'],
      default: '',
    },

    // true = activo (alta) | false = inactivo (baja)
    activo: {
      type: Boolean,
      default: true,
    },

    // Quién realizó la última modificación de estado
    modificadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    nivel: {
    type: Number,
    required: true,
    default: 1
    }
  },
  {
    timestamps: true,           // createdAt, updatedAt automáticos
    versionKey: false,
  }
);

// nombre ya tiene índice único por unique:true en el campo

module.exports = mongoose.model('Role', RoleSchema);
