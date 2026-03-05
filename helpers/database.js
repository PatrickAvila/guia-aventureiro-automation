// automation/helpers/database.js
// Helpers comuns para conexão com banco de dados

require('dotenv').config();
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

/**
 * Conectar ao MongoDB usando Mongoose (para scripts que usam models)
 */
async function connectDB() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI não configurado no .env');
  }
  
  console.log('🔌 Conectando ao MongoDB via Mongoose...');
  
  // Se já está conectado, não conectar novamente
  if (mongoose.connection.readyState === 1) {
    console.log('✅ Já conectado ao MongoDB\n');
    return;
  }
  
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    bufferCommands: false, // Desabilita buffering para evitar timeout silencioso
  });
  
  // Aguardar conexão estar completa e testar com um ping
  await new Promise((resolve, reject) => {
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.db.admin().ping().then(resolve).catch(reject);
    } else {
      mongoose.connection.once('connected', () => {
        mongoose.connection.db.admin().ping().then(resolve).catch(reject);
      });
      mongoose.connection.once('error', reject);
    }
  });
  
  console.log('✅ Conectado ao MongoDB\n');
}

/**
 * Desconectar do MongoDB (Mongoose)
 */
async function closeDB() {
  await mongoose.connection.close();
  console.log('\n🔌 Desconectado do MongoDB');
}

/**
 * Conectar ao MongoDB usando driver nativo (mais rápido e confiável)
 */
async function connectMongo() {
  const client = new MongoClient(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  });
  
  console.log('🔌 Conectando ao MongoDB...');
  await client.connect();
  console.log('✅ Conectado ao MongoDB\n');
  
  return client;
}

/**
 * Desconectar do MongoDB
 */
async function disconnectMongo(client) {
  await client.close();
  console.log('\n🔌 Desconectado do MongoDB');
}

/**
 * Wrapper para executar operações com auto-cleanup
 */
async function withDatabase(callback) {
  const client = await connectMongo();
  
  try {
    const db = client.db();
    return await callback(db);
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    await disconnectMongo(client);
  }
}

module.exports = {
  connectDB,
  closeDB,
  connectMongo,
  disconnectMongo,
  withDatabase,
};
