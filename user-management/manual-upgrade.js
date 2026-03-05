/**
 * Simula manualmente o upgrade de um usuário para Premium
 * (útil quando webhook não dispara)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const mongoose = require('mongoose');
const stripeService = require('../backend/src/services/stripeService');

async function manualUpgrade(email,stripeSubscriptionId) {
  try {
    // Conectar ao MongoDB com configurações adequadas
    console.log('🔄 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      bufferCommands: false,
      maxPoolSize: 10
    });
    
    // Aguardar conexão estar realmente pronta
    await mongoose.connection.db.admin().ping();
    console.log('✅ Conectado!');
    
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
      return;
    }
    
    console.log(`✅ Usuário encontrado: ${user.name} (${user._id})`);
    
    // Verificar subscription atual
    const subscription = await Subscription.findOne({ user: user._id }).maxTimeMS(30000);
    if (!subscription) {
      console.log('❌ Subscription não encontrada');
      await mongoose.disconnect();
      return;
    }
    
    console.log(`\n📋 Status atual:`);
    console.log(`   Plan: ${subscription.plan}`);
    console.log(`   Payment Status: ${subscription.paymentStatus}`);
    
    if (subscription.plan === 'premium') {
      console.log('\n✅ Usuário já está Premium!');
      await mongoose.disconnect();
      return;
    }
    
    // Fazer upgrade
    console.log(`\n⬆️  Fazendo upgrade para Premium...`);
    
    const stripeSubscription = {
      id: stripeSubscriptionId || 'sub_1T4TRoRunOGW68vfqEtCicIe',
      status: 'active',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // +30 dias
    };
    
    await stripeService.upgradeUserToPremium(user._id.toString(), stripeSubscription);
    
    console.log(`\n✅ Upgrade concluído!`);
    
    // Verificar resultado
    const updatedSubscription = await Subscription.findOne({ user: user._id }).maxTimeMS(30000);
    console.log(`\n📊 Status final:`);
    console.log(`   Plan: ${updatedSubscription.plan}`);
    console.log(`   Payment Status: ${updatedSubscription.paymentStatus}`);
    console.log(`   Stripe Subscription: ${updatedSubscription.stripeSubscriptionId}`);
    console.log(`   Roteiros: ${updatedSubscription.limits.itineraries.limit}`);
    console.log(`   Gerações AI: ${updatedSubscription.limits.aiGenerations.limit}`);
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error(`\n❌ Erro: ${error.message}`);
    console.error(error.stack);
    await mongoose.disconnect();
  }
}

const email = process.argv[2] || 'patrick_avila99@outlook.com';
const subId = process.argv[3];

manualUpgrade(email, subId);
