/**
 * models/User.js
 *
 * Los usuarios nunca se eliminan; su estado cambia entre ALTA y BAJA.
 * Un usuario puede tener múltiples roles.
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: [100, 'El nombre no puede superar 100 caracteres'],
    },

    apellidos: {
      type: String,
      trim: true,
      maxlength: [100, 'Los apellidos no pueden superar 100 caracteres'],
      default: '',
    },

    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'El email no tiene un formato válido'],
    },

    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
      select: false,            // Nunca se devuelve en queries por defecto
    },

    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
      },
    ],

    // ALTA = activo | BAJA = inactivo
    estado: {
      type: String,
      enum: ['ALTA', 'BAJA'],
      default: 'ALTA',
    },

    // Historial de cambios de estado
    historialEstado: [
      {
        estado:     { type: String, enum: ['ALTA', 'BAJA'] },
        fecha:      { type: Date, default: Date.now },
        realizadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        motivo:     { type: String, default: '' },
      },
    ],

    // Refresh tokens activos (permite multi-dispositivo)
    refreshTokens: {
      type: [String],
      select: false,
      default: [],
    },

    // Último acceso registrado
    ultimoAcceso: {
      type: Date,
      default: null,
    },

    // Quién creó el registro
    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    avisoPrivacidadAceptado: {
  type: Boolean,
  default: false,
  },

  fechaAceptacionAviso: {
    type: Date,
    default: null,
  },
  avisoPrivacidadAceptado: {
  type: Boolean,
  default: false,
  },

  fechaAceptacionAviso: {
    type: Date,
    default: null,
  },
    // ← NUEVO
  requiereCambioPassword: {
    type: Boolean,
    default: true,   // Todo usuario nuevo debe cambiar su contraseña
  },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Hooks ────────────────────────────────────────────────────────────────────

// Hash de contraseña antes de guardar
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
  this.password    = await bcrypt.hash(this.password, saltRounds);
  next();
});

// ─── Métodos de instancia ─────────────────────────────────────────────────────

UserSchema.methods.compararPassword = async function (candidato) {
  return bcrypt.compare(candidato, this.password);
};

UserSchema.methods.toPublic = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.historialEstado;
  return obj;
};

// ─── Índices ──────────────────────────────────────────────────────────────────
// email ya tiene índice único por unique:true en el campo
UserSchema.index({ estado: 1 });

module.exports = mongoose.model('User', UserSchema);
