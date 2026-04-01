/**
 * scripts/seed.js
 *
 * Crea los roles iniciales y un usuario administrador (Director).
 * Ejecutar UNA sola vez: node scripts/seed.js
 */

require('dotenv').config();

const mongoose        = require('mongoose');
const { connectDB }   = require('../src/config/database');
const Role            = require('../src/models/Role');
const User            = require('../src/models/User');

const ROLES_INICIALES = [
  { nombre: 'DIRECTOR',                   descripcion: 'Acceso total al sistema' },
  { nombre: 'COORDINADOR',                descripcion: 'Coordinación de áreas y equipos' },
  { nombre: 'AUXILIAR_ADMINISTRATIVO',    descripcion: 'Apoyo en tareas administrativas' },
];

async function seed() {
  await connectDB();
  console.log('\n🌱  Iniciando seed...\n');

  // ── Crear roles ──────────────────────────────────────────────────────────────
  for (const datos of ROLES_INICIALES) {
    const existe = await Role.findOne({ nombre: datos.nombre });
    if (existe) {
      console.log(`  ⚠️  Rol ya existe: ${datos.nombre}`);
      continue;
    }
    await Role.create(datos);
    console.log(`  ✅  Rol creado: ${datos.nombre}`);
  }

  // ── Crear usuario admin ───────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@empresa.com';
  const adminPass  = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
  const adminName  = process.env.SEED_ADMIN_NAME || 'Administrador';

  const rolDirector = await Role.findOne({ nombre: 'DIRECTOR' });

  const existeAdmin = await User.findOne({ email: adminEmail });
  if (existeAdmin) {
    console.log(`\n  ⚠️  Usuario admin ya existe: ${adminEmail}`);
  } else {
    await User.create({
      nombre:   adminName,
      email:    adminEmail,
      password: adminPass,
      roles:    [rolDirector._id],
      estado:   'ALTA',
      historialEstado: [{ estado: 'ALTA', motivo: 'Seed inicial' }],
    });
    console.log(`\n  ✅  Usuario admin creado: ${adminEmail} / ${adminPass}`);
    console.log('  ⚠️   Cambia la contraseña después del primer inicio de sesión.\n');
  }

  console.log('\n🏁  Seed completado.\n');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
