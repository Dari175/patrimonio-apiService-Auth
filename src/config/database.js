const mongoose = require('mongoose');

function buildUri() {
  const {
    MONGO_CONNECTION_TYPE = 'direct',
    MONGO_USER,
    MONGO_PASS,
    MONGO_DB = 'auth_service',

    // direct
    MONGO_HOST0,
    MONGO_HOST1,
    MONGO_HOST2,
    MONGO_PORT = '27017',
    MONGO_RS,
    MONGO_AUTH_DB = 'admin',

    // srv
    MONGO_SRV_HOST,
  } = process.env;

  const user = encodeURIComponent(MONGO_USER);
  const pass = encodeURIComponent(MONGO_PASS);

  if (MONGO_CONNECTION_TYPE === 'srv') {
    if (!MONGO_SRV_HOST) {
      throw new Error('Falta MONGO_SRV_HOST para conexión SRV');
    }

    return `mongodb+srv://${user}:${pass}@${MONGO_SRV_HOST}/${MONGO_DB}?retryWrites=true&w=majority&appName=Cluster0`;
  }

  // DIRECT
  const missing = ['MONGO_HOST0','MONGO_HOST1','MONGO_HOST2','MONGO_RS']
    .filter(k => !process.env[k]);

  if (missing.length) {
    throw new Error(`Faltan variables para conexión directa: ${missing.join(', ')}`);
  }

  const hosts = [MONGO_HOST0, MONGO_HOST1, MONGO_HOST2]
    .map(h => `${h}:${MONGO_PORT}`)
    .join(',');

  return (
    `mongodb://${user}:${pass}@${hosts}/${MONGO_DB}` +
    `?replicaSet=${MONGO_RS}&tls=true&authSource=${MONGO_AUTH_DB}&retryWrites=true&w=majority`
  );
}

const MONGOOSE_OPTS = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

async function connectDB() {
  let uri;

  try {
    uri = buildUri();
  } catch (err) {
    console.error('❌ Configuración de BD incompleta:', err.message);
    process.exit(1);
  }

  const tipo = process.env.MONGO_CONNECTION_TYPE === 'srv' ? 'SRV' : 'Directa';

  try {
    await mongoose.connect(uri, MONGOOSE_OPTS);

    console.log(`✅ MongoDB conectado`);
    console.log(`   → Tipo: ${tipo}`);
    console.log(`   → DB: ${process.env.MONGO_DB}`);
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB desconectado');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB reconectado');
  });
}

module.exports = { connectDB };