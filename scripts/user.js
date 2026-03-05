#!/usr/bin/env node
// automation/user.js
// Script consolidado para operações de usuário
// Substitui: check-user.js, check-subscription.js, reset-user.js, reset-usage.js, reset-achievements.js

const { withDatabase } = require('./helpers/database');
const { getUserByEmail, getUser, getUserSubscription, getSubscriptionUsage, countUserItineraries, getUserAchievements } = require('./helpers/queries');
const { resetUserToFree, resetSubscriptionToFree, resetUserStats, deleteUserItineraries, deleteUserAchievements } = require('./helpers/user-operations');

const args = process.argv.slice(2);

// Parse argumentos
const getArg = (name) => {
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : null;
};

const hasFlag = (name) => args.includes(name);

const email = getArg('--email') || getArg('-e');
const action = getArg('--action') || getArg('-a') || 'check';
const help = hasFlag('--help') || hasFlag('-h');

// Mostrar ajuda
if (help || !email) {
  console.log(`
📋 Script Consolidado de Gerenciamento de Usuário

USO:
  node user.js --email <email> [--action <ação>]

OPÇÕES:
  --email, -e      Email do usuário (obrigatório)
  --action, -a     Ação a executar (padrão: check)
  --help, -h       Mostrar esta ajuda

AÇÕES DISPONÍVEIS:
  check            Verificar informações do usuário (padrão)
  reset-all        Resetar tudo (roteiros + subscription + stats + achievements)
  reset-itineraries Deletar apenas roteiros e fotos
  reset-subscription Resetar apenas subscription para FREE
  reset-stats      Resetar apenas stats (level, xp, achievements)
  reset-achievements Deletar apenas achievements

EXEMPLOS:
  node user.js --email patrick@email.com
  node user.js -e patrick@email.com -a reset-all
  node user.js -e patrick@email.com -a reset-subscription
  node user.js -e test@test.com -a reset-itineraries

NOTA:
  - Todas as ações de reset confirmam antes de executar
  - reset-all é equivalente a reset completo do usuário
  - reset-itineraries também deleta fotos do Cloudinary
`);
  process.exit(0);
}

// Função principal
async function main() {
  await withDatabase(async (db) => {
    console.log(`\n🔍 Buscando usuário: ${email}\n`);
    
    // Buscar usuário
    const user = await getUserByEmail(db, email);
    
    if (!user) {
      console.log('❌ Usuário não encontrado!\n');
      return;
    }
    
    console.log(`✅ Usuário encontrado: ${user.name}\n`);
    
    // Buscar dados relacionados
    const subscription = await getUserSubscription(db, user._id);
    const usage = await getSubscriptionUsage(db, user._id);
    const itineraryCount = await countUserItineraries(db, user._id);
    const achievements = await getUserAchievements(db, user._id);
    
    // AÇÃO: CHECK (padrão)
    if (action === 'check') {
      console.log('📊 INFORMAÇÕES DO USUÁRIO\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      console.log('👤 PERFIL:');
      console.log(`   Nome: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Criado em: ${user.createdAt}\n`);
      
      console.log('📈 STATS:');
      console.log(`   Level: ${user.stats?.level || 1}`);
      console.log(`   XP: ${user.stats?.xp || 0}`);
      console.log(`   Roteiros criados: ${itineraryCount}`);
      console.log(`   Conquistas: ${achievements.length}`);
      console.log(`   Badges: ${user.stats?.unlockedBadges?.length || 0}\n`);
      
      if (subscription) {
        console.log('💳 SUBSCRIPTION:');
        console.log(`   Plano: ${subscription.plan.toUpperCase()}`);
        console.log(`   Status: ${subscription.status}`);
        console.log(`   Início: ${subscription.startDate}\n`);
        
        console.log('📊 USAGE:');
        console.log(`   Roteiros: ${usage.itineraries.current}/${usage.itineraries.limit}`);
        console.log(`   IA (mês): ${usage.aiGenerations.current}/${usage.aiGenerations.limit === -1 ? '∞' : usage.aiGenerations.limit}`);
        console.log(`   Criações (mês): ${usage.monthlyCreations.count}/${usage.monthlyCreations.limit}`);
        console.log(`   Fotos: ${usage.photos.current}/${usage.photos.limit === 0 ? 'sem upload' : usage.photos.limit}`);
        
        if (usage.aiGenerations.lastReset) {
          console.log(`   Último reset: ${new Date(usage.aiGenerations.lastReset).toLocaleDateString('pt-BR')}`);
        }
      } else {
        console.log('❌ Subscription não encontrada\n');
      }
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
    
    // AÇÃO: RESET-ALL
    else if (action === 'reset-all') {
      console.log('⚠️  ATENÇÃO: Esta ação irá resetar TUDO do usuário:\n');
      console.log(`   • ${itineraryCount} roteiro(s) serão deletados`);
      console.log(`   • Todas as fotos do Cloudinary serão deletadas`);
      console.log(`   • ${achievements.length} conquista(s) serão removidas`);
      console.log(`   • Stats serão zerados (level 1, xp 0)`);
      console.log(`   • Subscription será resetada para FREE\n`);
      
      console.log('🔄 Executando reset completo...\n');
      await resetUserToFree(db, user._id, user.name, user.email);
    }
    
    // AÇÃO: RESET-ITINERARIES
    else if (action === 'reset-itineraries') {
      console.log(`⚠️  Deletando ${itineraryCount} roteiro(s) e suas fotos...\n`);
      await deleteUserItineraries(db, user._id);
      
      // Atualizar contador de roteiros na subscription
      await db.collection('subscriptions').updateOne(
        { user: user._id },
        { $set: { 'usage.itineraries.current': 0 } }
      );
      console.log('   ✅ Contador de roteiros atualizado\n');
    }
    
    // AÇÃO: RESET-SUBSCRIPTION
    else if (action === 'reset-subscription') {
      console.log('⚠️  Resetando subscription para FREE...\n');
      await resetSubscriptionToFree(db, user._id);
      console.log('   ✅ Subscription resetada para FREE');
      console.log('   📊 Limites FREE: 5 roteiros | 15 IA/mês | 0 fotos\n');
    }
    
    // AÇÃO: RESET-STATS
    else if (action === 'reset-stats') {
      console.log('⚠️  Resetando stats (level, XP, achievements)...\n');
      await resetUserStats(db, user._id);
      await deleteUserAchievements(db, user._id);
      console.log('   ✅ Stats resetados');
      console.log('   📊 Level: 1 | XP: 0 | Achievements: 0\n');
    }
    
    // AÇÃO: RESET-ACHIEVEMENTS
    else if (action === 'reset-achievements') {
      console.log(`⚠️  Deletando ${achievements.length} conquista(s)...\n`);
      await deleteUserAchievements(db, user._id);
      
      // Resetar arrays de achievements no user
      await db.collection('users').updateOne(
        { _id: user._id },
        { 
          $set: { 
            'stats.achievements': [],
            'stats.unlockedBadges': []
          }
        }
      );
      console.log('   ✅ Conquistas deletadas\n');
    }
    
    // AÇÃO INVÁLIDA
    else {
      console.log(`❌ Ação inválida: ${action}`);
      console.log('   Use --help para ver ações disponíveis\n');
    }
  });
}

main().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
