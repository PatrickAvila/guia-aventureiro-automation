/**
 * Verifica status da subscription de um usuário
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const mongoose = require('mongoose');

async function checkUserSubscription(email) {
  try {
    // Conectar ao MongoDB com configurações adequadas
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      bufferCommands: false,
      maxPoolSize: 10
    });
    
    // Aguardar conexão estar realmente pronta
    await mongoose.connection.db.admin().ping();
    console.log('✅ Conectado ao MongoDB');
    
    // Esperar um pouco para garantir que a conexão está estável
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Importar models DEPOIS da conexão
    delete require.cache[require.resolve('../backend/src/models/User')];
    delete require.cache[require.resolve('../backend/src/models/Subscription')];
    const User = require('../backend/src/models/User');
    const Subscription = require('../backend/src/models/Subscription');
    
    // Buscar usuário
    console.log(`\n🔍 Buscando usuário ${email}...`);
    const user = await User.findOne({ email }).maxTimeMS(30000);
    if (!user) {
      console.log(`❌ Usuário ${email} não encontrado`);
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log(`\n📧 Usuário: ${user.email}`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Nome: ${user.name}`);
    
    // Buscar subscription
    console.log(`\n🔍 Buscando subscription...`);
    const subscription = await Subscription.findOne({ user: user._id }).maxTimeMS(30000);
    if (!subscription) {
      console.log('\n❌ Subscription não encontrada');
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log(`\n💳 Subscription:`);
    console.log(`   Plan: ${subscription.plan}`);
    console.log(`   Status: ${subscription.paymentStatus}`);
    console.log(`   Stripe Customer: ${subscription.stripeCustomerId || 'N/A'}`);
    console.log(`   Stripe Subscription: ${subscription.stripeSubscriptionId || 'N/A'}`);
    
    console.log(`\n📊 Limites:`);
    console.log(`   Roteiros: ${subscription.limits.itineraries.current}/${subscription.limits.itineraries.limit}`);
    console.log(`   Gerações AI: ${subscription.limits.aiGenerations.current}/${subscription.limits.aiGenerations.limit}`);
    
    if (subscription.plan === 'premium') {
      console.log(`\n✅ Usuário está PREMIUM!`);
    } else {
      console.log(`\n⚠️  Usuário ainda está FREE`);
    }
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Erro: ${error.message}`);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

const email = process.argv[2] || 'patrick_avila99@outlook.com';
checkUserSubscription(email);
