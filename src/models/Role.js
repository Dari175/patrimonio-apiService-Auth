/**
 * models/Role.js
 */

const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del rol es obligatorio'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [50, 'El nombre no puede superar 50 caracteres'],
    },

    descripcion: {
      type: String,
      trim: true,
      maxlength: [200, 'La descripción no puede superar 200 caracteres'],
      default: '',
    },

    activo: {
      type: Boolean,
      default: true,
    },

    modificadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // 🔥 NIVEL (1 = más alto)
    nivel: {
      type: Number,
      required: true,
      default: 1
    },

    // 🔥 PERMISOS DINÁMICOS
    permisos: [
      {
        modulo: {
          type: String,
          required: true,
          trim: true,
          lowercase: true
        },
        acciones: [
          {
            type: String,
            enum: ['crear', 'leer', 'editar', 'eliminar']
          }
        ]
      }
    ]
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('Role', RoleSchema);