#!/usr/bin/env node
// automation/itineraries.js
// Script consolidado para operações de itinerários
// Substitui: list-all-roteiros.js, delete-all-itineraries.js, delete-orphan-roteiros.js, cleanup-orphans.js

const { withDatabase } = require('./helpers/database');
const { getUserByEmail, findOrphanItineraries } = require('./helpers/queries');
const { deleteItineraryPhotos } = require('./helpers/cloudinary');

const args = process.argv.slice(2);

// Parse argumentos
const getArg = (name) => {
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : null;
};

const hasFlag = (name) => args.includes(name);

const email = getArg('--email') || getArg('-e');
const action = getArg('--action') || getArg('-a') || 'list';
const help = hasFlag('--help') || hasFlag('-h');

// Mostrar ajuda
if (help) {
  console.log(`
📋 Script Consolidado de Gerenciamento de Itinerários

USO:
  node itineraries.js [--email <email>] [--action <ação>]

OPÇÕES:
  --email, -e      Email do usuário (opcional para list/orphans)
  --action, -a     Ação a executar (padrão: list)
  --help, -h       Mostrar esta ajuda

AÇÕES DISPONÍVEIS:
  list             Listar todos os roteiros (ou de um usuário específico)
  delete           Deletar todos roteiros de um usuário (requer --email)
  orphans          Listar roteiros órfãos (sem dono)
  cleanup-orphans  Deletar roteiros órfãos
  stats            Estatísticas gerais de roteiros

EXEMPLOS:
  node itineraries.js
  node itineraries.js --action list
  node itineraries.js --email patrick@email.com
  node itineraries.js --email patrick@email.com --action delete
  node itineraries.js --action orphans
  node itineraries.js --action cleanup-orphans
  node itineraries.js --action stats

NOTA:
  - list sem email mostra todos os roteiros do banco
  - delete também remove fotos do Cloudinary
  - cleanup-orphans é útil após deletar usuários
`);
  process.exit(0);
}

// Formatar data
function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('pt-BR');
}

// Função principal
async function main() {
  await withDatabase(async (db) => {
    
    // AÇÃO: LIST
    if (action === 'list') {
      if (email) {
        // Listar roteiros de um usuário específico
        const user = await db.collection('users').findOne({ email });
        
        if (!user) {
          console.log(`❌ Usuário não encontrado: ${email}\n`);
          return;
        }
        
        const itineraries = await db.collection('itineraries').find({ owner: user._id }).toArray();
        
        console.log(`\n📋 Roteiros de ${user.name} (${email})\n`);
        console.log(`Total: ${itineraries.length} roteiro(s)\n`);
        
        if (itineraries.length > 0) {
          itineraries.forEach((it, index) => {
            const photos = it.rating?.photos?.length || 0;
            console.log(`${index + 1}. ${it.destination || 'Sem título'}`);
            console.log(`   ID: ${it._id}`);
            console.log(`   Criado: ${formatDate(it.createdAt)}`);
            console.log(`   Fotos: ${photos}`);
            console.log(`   Público: ${it.isPublic ? 'Sim' : 'Não'}`);
            console.log('');
          });
        }
      } else {
        // Listar todos os roteiros
        const itineraries = await db.collection('itineraries').find({}).toArray();
        const users = await db.collection('users').find({}).toArray();
        
        console.log(`\n📋 Todos os Roteiros\n`);
        console.log(`Total: ${itineraries.length} roteiro(s)\n`);
        
        // Agrupar por usuário
        const byUser = {};
        
        for (const it of itineraries) {
          const userId = it.owner.toString();
          if (!byUser[userId]) byUser[userId] = [];
          byUser[userId].push(it);
        }
        
        for (const user of users) {
          const userId = user._id.toString();
          const userItineraries = byUser[userId] || [];
          
          console.log(`👤 ${user.name} (${user.email})`);
          console.log(`   Total: ${userItineraries.length} roteiro(s)`);
          
          if (userItineraries.length > 0) {
            userItineraries.forEach((it, index) => {
              const photos = it.rating?.photos?.length || 0;
              console.log(`   ${index + 1}. ${it.destination || 'Sem título'} (${photos} foto${photos !== 1 ? 's' : ''})`);
            });
          }
          console.log('');
        }
      }
    }
    
    // AÇÃO: DELETE
    else if (action === 'delete') {
      if (!email) {
        console.log('❌ Email é obrigatório para delete\n');
        console.log('Use: node itineraries.js --email patrick@email.com --action delete\n');
        return;
      }
      
      const user = await db.collection('users').findOne({ email });
      
      if (!user) {
        console.log(`❌ Usuário não encontrado: ${email}\n`);
        return;
      }
      
      const itineraries = await db.collection('itineraries').find({ owner: user._id }).toArray();
      
      if (itineraries.length === 0) {
        console.log(`\n📋 ${user.name} não tem nenhum roteiro\n`);
        return;
      }
      
      console.log(`\n⚠️  Deletando ${itineraries.length} roteiro(s) de ${user.name}...\n`);
      
      // Deletar fotos
      let totalPhotos = 0;
      let deletedPhotos = 0;
      
      for (const itinerary of itineraries) {
        const photos = itinerary.rating?.photos || [];
        if (photos.length > 0) {
          totalPhotos += photos.length;
          deletedPhotos += await deleteItineraryPhotos(itinerary);
        }
      }
      
      if (totalPhotos > 0) {
        console.log(`   🗑️  ${deletedPhotos}/${totalPhotos} foto(s) deletadas do Cloudinary`);
      }
      
      // Deletar roteiros
      await db.collection('itineraries').deleteMany({ owner: user._id });
      console.log(`   ✅ ${itineraries.length} roteiro(s) deletado(s)`);
      
      // Atualizar contador
      await db.collection('subscriptions').updateOne(
        { user: user._id },
        { $set: { 'usage.itineraries.current': 0 } }
      );
      console.log(`   ✅ Contador atualizado\n`);
    }
    
    // AÇÃO: ORPHANS
    else if (action === 'orphans') {
      console.log('\n🔍 Buscando roteiros órfãos...\n');
      
      const orphans = await findOrphanItineraries(db);
      
      console.log(`Total: ${orphans.length} roteiro(s) órfão(s)\n`);
      
      if (orphans.length > 0) {
        orphans.forEach((it, index) => {
          const photos = it.rating?.photos?.length || 0;
          console.log(`${index + 1}. ${it.destination || 'Sem título'}`);
          console.log(`   ID: ${it._id}`);
          console.log(`   Owner ID: ${it.owner}`);
          console.log(`   Criado: ${formatDate(it.createdAt)}`);
          console.log(`   Fotos: ${photos}`);
          console.log('');
        });
        
        console.log(`💡 Use --action cleanup-orphans para deletar esses roteiros\n`);
      }
    }
    
    // AÇÃO: CLEANUP-ORPHANS
    else if (action === 'cleanup-orphans') {
      console.log('\n🗑️  Deletando roteiros órfãos...\n');
      
      const orphans = await findOrphanItineraries(db);
      
      if (orphans.length === 0) {
        console.log('✅ Nenhum roteiro órfão encontrado\n');
        return;
      }
      
      console.log(`⚠️  Encontrados ${orphans.length} roteiro(s) órfão(s)\n`);
      
      // Deletar fotos
      let totalPhotos = 0;
      let deletedPhotos = 0;
      
      for (const itinerary of orphans) {
        const photos = itinerary.rating?.photos || [];
        if (photos.length > 0) {
          totalPhotos += photos.length;
          deletedPhotos += await deleteItineraryPhotos(itinerary);
        }
      }
      
      if (totalPhotos > 0) {
        console.log(`   🗑️  ${deletedPhotos}/${totalPhotos} foto(s) deletadas do Cloudinary`);
      }
      
      // Deletar roteiros
      const orphanIds = orphans.map(it => it._id);
      await db.collection('itineraries').deleteMany({ _id: { $in: orphanIds } });
      console.log(`   ✅ ${orphans.length} roteiro(s) órfão(s) deletado(s)\n`);
    }
    
    // AÇÃO: STATS
    else if (action === 'stats') {
      console.log('\n📊 Estatísticas de Roteiros\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      const itineraries = await db.collection('itineraries').find({}).toArray();
      const users = await db.collection('users').find({}).toArray();
      const orphans = await findOrphanItineraries(db);
      
      // Contadores
      let totalPhotos = 0;
      let publicCount = 0;
      let withPhotosCount = 0;
      
      itineraries.forEach(it => {
        const photos = it.rating?.photos?.length || 0;
        totalPhotos += photos;
        if (photos > 0) withPhotosCount++;
        if (it.isPublic) publicCount++;
      });
      
      console.log('📋 GERAL:');
      console.log(`   Total de roteiros: ${itineraries.length}`);
      console.log(`   Total de usuários: ${users.length}`);
      console.log(`   Roteiros órfãos: ${orphans.length}`);
      console.log(`   Média por usuário: ${(itineraries.length / users.length).toFixed(1)}\n`);
      
      console.log('📷 FOTOS:');
      console.log(`   Total de fotos: ${totalPhotos}`);
      console.log(`   Roteiros com fotos: ${withPhotosCount}`);
      console.log(`   Média de fotos/roteiro: ${itineraries.length > 0 ? (totalPhotos / itineraries.length).toFixed(1) : 0}\n`);
      
      console.log('🌍 VISIBILIDADE:');
      console.log(`   Públicos: ${publicCount}`);
      console.log(`   Privados: ${itineraries.length - publicCount}\n`);
      
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
