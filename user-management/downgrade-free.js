/**
 * Downgrade usuário para FREE (para testes)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { MongoClient } = require('mongodb');

async function downgradeToFree(email) {
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
    
    // Downgrade
    console.log(`\n⬇️  Fazendo downgrade para FREE...`);
    
    const result = await db.collection('subscriptions').updateOne(
      { user: user._id },
      {
        $set: {
          plan: 'free',
          paymentStatus: 'inactive',
          stripeSubscriptionId: null,
          'limits.itineraries.limit': 5,
          'limits.itineraries.current': 0,
          'limits.aiGenerations.limit': 15,
          'limits.aiGenerations.current': 0,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`✅ Downgrade realizado com sucesso!`);
      
      // Verificar resultado
      const updated = await db.collection('subscriptions').findOne({ user: user._id });
      console.log(`\n📊 Estado final:`);
      console.log(`   Plan: ${updated.plan}`);
      console.log(`   Status: ${updated.paymentStatus}`);
      console.log(`   Roteiros: ${updated.limits.itineraries.current}/${updated.limits.itineraries.limit}`);
      console.log(`   Gerações AI: ${updated.limits.aiGenerations.current}/${updated.limits.aiGenerations.limit}`);
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
downgradeToFree(email);
