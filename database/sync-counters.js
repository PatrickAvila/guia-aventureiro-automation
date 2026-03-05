#!/usr/bin/env node
// sync-counters.js - Sincronizar contadores de subscription com dados reais do banco
// Corrige inconsistências entre contadores armazenados e dados reais

const { withDatabase } = require('./helpers/database');
const { ObjectId } = require('mongodb');

const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : null;
};

const email = getArg('--email') || getArg('-e');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔄 Script de Sincronização de Contadores

USO:
  node sync-counters.js [--email <email>]

OPÇÕES:
  --email, -e     Email do usuário (opcional - sem isso sincroniza TODOS)
  --help, -h      Mostrar esta ajuda

O QUE FAZ:
  1. Conta roteiros REAIS no banco para cada usuário
  2. Atualiza counters na subscription:
     - itineraries.current = roteiros ativos
     - aiGenerations.current = roteiros criados este mês

EXEMPLOS:
  node sync-counters.js
  node sync-counters.js --email usuario@email.com
`);
  process.exit(0);
}

async function syncCounters() {
  await withDatabase(async (db) => {
    console.log('\n🔄 Sincronizando contadores de subscription com dados reais...\n');
    
    // Filtro para usuário específico ou todos
    const userFilter = email ? { email } : {};
    const users = await db.collection('users').find(userFilter).toArray();
    
    if (users.length === 0) {
      console.log('❌ Nenhum usuário encontrado\n');
      return;
    }
    
    console.log(`📊 ${users.length} usuário(s) encontrado(s)\n`);
    
    for (const user of users) {
      console.log(`\n👤 ${user.email}`);
      console.log('─'.repeat(60));
      
      // Buscar subscription
      const subscription = await db.collection('subscriptions').findOne({ user: user._id });
      
      if (!subscription) {
        console.log('⚠️  Sem subscription - pulando...');
        continue;
      }
      
      // Contar roteiros REAIS no banco
      const totalItineraries = await db.collection('itineraries').countDocuments({
        owner: user._id
      });
      
      // Pegar data do último reset mensal
      const lastReset = subscription.usage?.aiGenerations?.lastReset || new Date();
      const resetDate = new Date(lastReset);
      resetDate.setDate(1); // Primeiro dia do mês do último reset
      
      // Contar roteiros criados NESTE MÊS (desde o último reset)
      const monthlyCreations = await db.collection('itineraries').countDocuments({
        owner: user._id,
        createdAt: { $gte: resetDate }
      });
      
      // Estado ANTES
      console.log('\n📊 ANTES:');
      console.log(`   Roteiros (armazenado): ${subscription.usage?.itineraries?.current || 0}/${subscription.usage?.itineraries?.limit || 0}`);
      console.log(`   Criações mensais (armazenado): ${subscription.usage?.aiGenerations?.current || 0}/${subscription.usage?.aiGenerations?.limit || 0}`);
      
      console.log('\n🔍 REAL (no banco):');
      console.log(`   Roteiros totais: ${totalItineraries}`);
      console.log(`   Criados este mês (desde ${resetDate.toLocaleDateString('pt-BR')}): ${monthlyCreations}`);
      
      // Atualizar subscription
      const updateResult = await db.collection('subscriptions').updateOne(
        { _id: subscription._id },
        {
          $set: {
            'usage.itineraries.current': totalItineraries,
            'usage.aiGenerations.current': monthlyCreations
          }
        }
      );
      
      if (updateResult.modifiedCount > 0) {
        console.log('\n✅ ATUALIZADO:');
        console.log(`   Roteiros: ${totalItineraries}/${subscription.usage?.itineraries?.limit || 0}`);
        console.log(`   Criações mensais: ${monthlyCreations}/${subscription.usage?.aiGenerations?.limit || 0}`);
        
        // Verificar se algum limite foi atingido
        const warnings = [];
        if (totalItineraries >= (subscription.usage?.itineraries?.limit || 0)) {
          warnings.push('⚠️  Limite de roteiros ativos atingido!');
        }
        if (monthlyCreations >= (subscription.usage?.aiGenerations?.limit || 0)) {
          warnings.push('⚠️  Limite de criações mensais atingido!');
        }
        
        if (warnings.length > 0) {
          console.log('');
          warnings.forEach(w => console.log(w));
        }
      } else {
        console.log('\n✓ Já estava sincronizado');
      }
    }
    
    console.log('\n' + '─'.repeat(60));
    console.log('✅ Sincronização concluída!\n');
  });
}

syncCounters();
