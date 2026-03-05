#!/usr/bin/env node
// update-ai-limit.js - Atualizar limite de IA (operação de manutenção)
// Usa helpers compartilhados ao invés de Mongoose direto

const { withDatabase } = require('./helpers/database');

const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : null;
};

const limit = parseInt(getArg('--limit') || getArg('-l') || '15', 10);
const plan = getArg('--plan') || getArg('-p') || 'free';

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📝 Script de Atualização de Limite de IA

USO:
  node update-ai-limit.js [--plan <plano>] [--limit <número>]

OPÇÕES:
  --plan, -p      Plano a atualizar (padrão: free)
  --limit, -l     Novo limite de IA (padrão: 15)
  --help, -h      Mostrar esta ajuda

EXEMPLOS:
  node update-ai-limit.js
  node update-ai-limit.js --plan free --limit 15
  node update-ai-limit.js --plan premium --limit -1
`);
  process.exit(0);
}

async function updateAILimit() {
  await withDatabase(async (db) => {
    console.log(`\n🔧 Atualizando limite de IA para plano ${plan.toUpperCase()}\n`);
    
    // Atualizar subscriptions
    const result = await db.collection('subscriptions').updateMany(
      { plan },
      { 
        $set: { 
          'usage.aiGenerations.limit': limit 
        } 
      }
    );

    console.log(`✅ ${result.modifiedCount} subscription(s) atualizada(s)\n`);

    // Buscar e mostrar subscriptions atualizadas
    const subs = await db.collection('subscriptions').find({ plan }).toArray();
    
    if (subs.length > 0) {
      console.log(`📋 Subscriptions ${plan.toUpperCase()} após atualização:\n`);
      
      for (const sub of subs) {
        // Buscar email do usuário
        const user = await db.collection('users').findOne({ _id: sub.user });
        const email = user?.email || 'N/A';
        
        console.log(`   • ${email}`);
        console.log(`     Roteiros: ${sub.usage?.itineraries?.current || 0}/${sub.usage?.itineraries?.limit || 0}`);
        console.log(`     IA: ${sub.usage?.aiGenerations?.current || 0}/${limit === -1 ? '∞' : limit} ✅`);
        console.log('');
      }
    } else {
      console.log(`⚠️  Nenhuma subscription ${plan.toUpperCase()} encontrada\n`);
    }
  });
}

updateAILimit();
