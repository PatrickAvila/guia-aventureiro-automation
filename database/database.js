#!/usr/bin/env node
// automation/database.js
// Script consolidado para operações gerais de banco de dados
// Substitui: list-users.js, list-users-direct.js, cleanup-and-reset.js

const { withDatabase } = require('./helpers/database');
const { listAllUsers } = require('./helpers/queries');
const { deleteTestUsers, resetUserToFree } = require('./helpers/user-operations');

const args = process.argv.slice(2);

// Parse argumentos
const getArg = (name) => {
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : null;
};

const hasFlag = (name) => args.includes(name);

const action = getArg('--action') || getArg('-a') || 'list-users';
const email = getArg('--email') || getArg('-e');
const help = hasFlag('--help') || hasFlag('-h');

// Mostrar ajuda
if (help) {
  console.log(`
📋 Script Consolidado de Gerenciamento de Banco de Dados

USO:
  node database.js [--action <ação>] [--email <email>]

OPÇÕES:
  --action, -a     Ação a executar (padrão: list-users)
  --email, -e      Email do usuário (para reset-production)
  --help, -h       Mostrar esta ajuda

AÇÕES DISPONÍVEIS:
  list-users       Listar todos usuários com informações básicas
  cleanup-test     Deletar usuários de teste
  reset-production Resetar usuário de produção (requer --email)
  stats            Estatísticas gerais do banco de dados

EXEMPLOS:
  node database.js
  node database.js --action list-users
  node database.js --action cleanup-test
  node database.js --action reset-production --email patrick@email.com
  node database.js --action stats

NOTA:
  - cleanup-test deleta usuários com @test.com ou cascade-test
  - reset-production reseta usuário real para FREE (uso em testes)
  - stats mostra visão geral de todas as collections
`);
  process.exit(0);
}

// Formatar bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Função principal
async function main() {
  await withDatabase(async (db) => {
    
    // AÇÃO: LIST-USERS
    if (action === 'list-users') {
      console.log('\n👥 Listando todos os usuários...\n');
      
      const users = await listAllUsers(db);
      
      console.log(`Total: ${users.length} usuário(s)\n`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Plano: ${user.plan.toUpperCase()}`);
        console.log(`   Roteiros: ${user.itineraries}`);
        console.log(`   Level ${user.level} (${user.xp} XP)`);
        console.log(`   Criado: ${new Date(user.createdAt).toLocaleDateString('pt-BR')}`);
        console.log('');
      });
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
    
    // AÇÃO: CLEANUP-TEST
    else if (action === 'cleanup-test') {
      console.log('\n🗑️  Limpeza de Usuários de Teste\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // Listar usuários de teste primeiro
      const testUsers = await db.collection('users').find({
        email: { $regex: /cascade-test|@test\.com/i }
      }).toArray();
      
      if (testUsers.length === 0) {
        console.log('✅ Nenhum usuário de teste encontrado\n');
        return;
      }
      
      console.log(`Encontrados ${testUsers.length} usuário(s) de teste:\n`);
      testUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
      });
      
      console.log('\n🗑️  Deletando...\n');
      
      const deletedCount = await deleteTestUsers(db);
      
      console.log(`\n✅ Limpeza concluída!`);
      console.log(`   Total deletado: ${deletedCount} usuário(s)\n`);
    }
    
    // AÇÃO: RESET-PRODUCTION
    else if (action === 'reset-production') {
      if (!email) {
        console.log('❌ Email é obrigatório para reset-production\n');
        console.log('Use: node database.js --action reset-production --email patrick@email.com\n');
        return;
      }
      
      const user = await db.collection('users').findOne({ email });
      
      if (!user) {
        console.log(`❌ Usuário não encontrado: ${email}\n`);
        return;
      }
      
      // Verificar se não é usuário de teste
      if (email.match(/@test\.com|cascade-test/i)) {
        console.log('❌ Use cleanup-test para deletar usuários de teste\n');
        return;
      }
      
      console.log('\n⚠️  RESET DE USUÁRIO DE PRODUÇÃO\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`   Nome: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user._id}\n`);
      
      await resetUserToFree(db, user._id, user.name, user.email);
    }
    
    // AÇÃO: STATS
    else if (action === 'stats') {
      console.log('\n📊 Estatísticas do Banco de Dados\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // Contadores básicos
      const userCount = await db.collection('users').countDocuments();
      const itineraryCount = await db.collection('itineraries').countDocuments();
      const subscriptionCount = await db.collection('subscriptions').countDocuments();
      const achievementCount = await db.collection('achievements').countDocuments();
      
      console.log('📋 COLLECTIONS:');
      console.log(`   Users: ${userCount}`);
      console.log(`   Itineraries: ${itineraryCount}`);
      console.log(`   Subscriptions: ${subscriptionCount}`);
      console.log(`   Achievements: ${achievementCount}\n`);
      
      // Distribuição de planos
      const planDistribution = await db.collection('subscriptions').aggregate([
        { $group: { _id: '$plan', count: { $sum: 1 } } }
      ]).toArray();
      
      console.log('💳 PLANOS:');
      planDistribution.forEach(plan => {
        console.log(`   ${plan._id.toUpperCase()}: ${plan.count} usuário(s)`);
      });
      console.log('');
      
      // Contagem de fotos
      const itineraries = await db.collection('itineraries').find({}).toArray();
      let totalPhotos = 0;
      itineraries.forEach(it => {
        totalPhotos += it.rating?.photos?.length || 0;
      });
      
      console.log('📷 FOTOS:');
      console.log(`   Total: ${totalPhotos}`);
      console.log(`   Média/roteiro: ${itineraryCount > 0 ? (totalPhotos / itineraryCount).toFixed(1) : 0}\n`);
      
      // Stats de storage do Cloudinary (estimativa)
      const avgPhotoSize = 500 * 1024; // ~500KB por foto
      const estimatedStorage = totalPhotos * avgPhotoSize;
      
      console.log('💾 STORAGE (Cloudinary):');
      console.log(`   Fotos armazenadas: ${totalPhotos}`);
      console.log(`   Uso estimado: ${formatBytes(estimatedStorage)}`);
      console.log(`   Limite FREE: 25 GB\n`);
      
      // Usuários de teste
      const testUserCount = await db.collection('users').countDocuments({
        email: { $regex: /@test\.com|cascade-test/i }
      });
      
      if (testUserCount > 0) {
        console.log('⚠️  ATENÇÃO:');
        console.log(`   ${testUserCount} usuário(s) de teste encontrado(s)`);
        console.log(`   Use --action cleanup-test para limpar\n`);
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
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
