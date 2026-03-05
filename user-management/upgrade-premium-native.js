/**
 * Faz upgrade completo para Premium usando driver nativo
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { MongoClient, ObjectId } = require('mongodb');

async function upgradeUserToPremium(email, stripeSubId) {
  const client = new MongoClient(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000
  });
  
  try {
    console.log('🔄 Conectando ao MongoDB...');
    await client.connect();
    console.log('✅ Conectado!');
    
    const db = client.db('guia_aventureiro_db');
    
    // Buscar usuário
    console.log(`\n🔍 Buscando usuário ${email}...`);
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      console.log(`❌ Usuário não encontrado`);
      return;
    }
    
    console.log(`✅ Usuário: ${user.name} (${user._id})`);
    
    // Buscar subscription
    const subscription = await db.collection('subscriptions').findOne({ user: user._id });
    
    if (!subscription) {
      console.log(`❌ Subscription não encontrada`);
      return;
    }
    
    console.log(`\n📋 Estado atual:`);
    console.log(`   Plan: ${subscription.plan}`);
    console.log(`   Status: ${subscription.paymentStatus}`);
    
    // Fazer upgrade
    console.log(`\n⬆️  Fazendo upgrade completo para Premium...`);
    
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 dias
    
    const result = await db.collection('subscriptions').updateOne(
      { user: user._id },
      {
        $set: {
          plan: 'premium',
          paymentStatus: 'active',
          stripeSubscriptionId: stripeSubId || 'sub_1T4TRoRunOGW68vfqEtCicIe',
          'limits.itineraries.limit': 50,
          'limits.itineraries.current': subscription.limits?.itineraries?.current || 0,
          'limits.aiGenerations.limit': 999999,
          'limits.aiGenerations.current': subscription.limits?.aiGenerations?.current || 0,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          updatedAt: now
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`✅ Upgrade realizado com sucesso!`);
      
      // Verificar resultado
      const updated = await db.collection('subscriptions').findOne({ user: user._id });
      console.log(`\n📊 Estado final:`);
      console.log(`   Plan: ${updated.plan}`);
      console.log(`   Status: ${updated.paymentStatus}`);
      console.log(`   Stripe Subscription: ${updated.stripeSubscriptionId}`);
      console.log(`   Roteiros: ${updated.limits.itineraries.current}/${updated.limits.itineraries.limit}`);
      console.log(`   Gerações AI: ${updated.limits.aiGenerations.current}/${updated.limits.aiGenerations.limit}`);
      console.log(`   Período: ${updated.currentPeriodStart.toLocaleDateString()} até ${updated.currentPeriodEnd.toLocaleDateString()}`);
      console.log(`\n🎉 Usuário ${user.name} agora é PREMIUM!`);
    } else {
      console.log(`⚠️  Nenhuma modificação realizada`);
    }
    
  } catch (error) {
    console.error(`\n❌ Erro: ${error.message}`);
  } finally {
    await client.close();
  }
}

const email = process.argv[2] || 'patrick_avila99@outlook.com';
const subId = process.argv[3];

upgradeUserToPremium(email, subId);
