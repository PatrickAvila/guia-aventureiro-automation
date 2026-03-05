require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../backend/src/models/User');

async function listUsers() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    mongoose.set('bufferTimeoutMS', 30000);
    const connection = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    
    // Esperar conexão estar pronta
    if (mongoose.connection.readyState !== 1) {
      await new Promise(resolve => mongoose.connection.once('open', resolve));
    }
    
    console.log('✅ Conectado ao MongoDB\n');

    const users = await User.find({}).select('name email createdAt stats preferences subscription');
    
    console.log(`📊 Total de usuários: ${users.length}\n`);
    console.log('=' .repeat(80));
    
    users.forEach((user, index) => {
      console.log(`\n👤 Usuário #${index + 1}`);
      console.log(`   Nome: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Cadastrado em: ${new Date(user.createdAt).toLocaleDateString('pt-BR')}`);
      console.log(`   Level: ${user.stats?.level || 1} | XP: ${user.stats?.xp || 0}`);
      console.log(`   Roteiros: ${user.stats?.totalItineraries || 0}`);
      console.log(`   Conquistas: ${user.stats?.achievements?.length || 0}`);
      console.log(`   Plano: ${user.subscription?.plan || 'free'}`);
      console.log(`   Preferências:`);
      console.log(`     - Orçamento: ${user.preferences?.budgetLevel || 'não definido'}`);
      console.log(`     - Estilo: ${user.preferences?.travelStyle || 'não definido'}`);
      console.log(`     - Interesses: ${user.preferences?.interests?.join(', ') || 'não definido'}`);
      console.log('-'.repeat(80));
    });

    console.log('\n✅ Lista completa!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

listUsers();
