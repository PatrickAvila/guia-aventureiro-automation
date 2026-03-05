// automation/helpers/user-operations.js
// Operações comuns relacionadas a usuários

const { deleteItineraryPhotos } = require('./cloudinary');

/**
 * Resetar subscription para plano FREE com novos limites (2 planos)
 */
async function resetSubscriptionToFree(db, userId) {
  const now = new Date();
  
  await db.collection('subscriptions').updateOne(
    { user: userId },
    {
      $set: {
        plan: 'free',
        status: 'active',
        startDate: now,
        endDate: null,
        cancelledAt: null,
        trialEndsAt: null,
        billingCycle: 'monthly',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        'usage.itineraries.current': 0,
        'usage.itineraries.limit': 5,
        'usage.monthlyCreations.count': 0,
        'usage.monthlyCreations.limit': 15,
        'usage.monthlyCreations.lastReset': now,
        'usage.aiGenerations.current': 0,
        'usage.aiGenerations.limit': 15,
        'usage.aiGenerations.lastReset': now,
        'usage.photos.current': 0,
        'usage.photos.limit': 0,
        'usage.collaborators.current': 0,
        'usage.collaborators.limit': 0,
        'features.offlineMode': false,
        'features.prioritySupport': false,
        'features.advancedAnalytics': false,
        'features.customBranding': false,
        'features.exportPDF': false,
        'features.apiAccess': false,
      }
    },
    { upsert: true }
  );
}

/**
 * Resetar stats do usuário
 */
async function resetUserStats(db, userId) {
  await db.collection('users').updateOne(
    { _id: userId },
    {
      $set: {
        'stats.itineraries': 0,
        'stats.achievements': [],
        'stats.unlockedBadges': [],
        'stats.xp': 0,
        'stats.level': 1,
        isPremium: false,
        premiumExpiry: null,
      }
    }
  );
}

/**
 * Deletar todos os roteiros de um usuário (incluindo fotos)
 */
async function deleteUserItineraries(db, userId) {
  const itineraries = await db.collection('itineraries').find({ owner: userId }).toArray();
  
  if (itineraries.length === 0) {
    console.log('   📋 Nenhum roteiro encontrado');
    return 0;
  }
  
  console.log(`   📋 Encontrados ${itineraries.length} roteiro(s)`);
  
  // Deletar fotos do Cloudinary
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
    console.log(`   🗑️  Total: ${deletedPhotos}/${totalPhotos} foto(s) deletadas do Cloudinary`);
  }
  
  // Deletar roteiros do MongoDB
  await db.collection('itineraries').deleteMany({ owner: userId });
  console.log(`   ✅ ${itineraries.length} roteiro(s) deletado(s)`);
  
  return itineraries.length;
}

/**
 * Deletar achievements de um usuário
 */
async function deleteUserAchievements(db, userId) {
  const result = await db.collection('achievements').deleteMany({ user: userId });
  if (result.deletedCount > 0) {
    console.log(`   ✅ ${result.deletedCount} conquista(s) deletada(s)`);
  }
  return result.deletedCount;
}

/**
 * Resetar usuário completamente para FREE
 */
async function resetUserToFree(db, userId, userName, userEmail) {
  console.log(`🔄 Resetando ${userName} (${userEmail})...\n`);
  
  // 1. Deletar roteiros e fotos
  await deleteUserItineraries(db, userId);
  
  // 2. Deletar conquistas
  await deleteUserAchievements(db, userId);
  
  // 3. Resetar subscription
  await resetSubscriptionToFree(db, userId);
  console.log(`   ✅ Subscription resetada para FREE`);
  
  // 4. Resetar stats
  await resetUserStats(db, userId);
  console.log(`   ✅ Stats resetados`);
  
  console.log(`\n   ✅ ${userName} resetado completamente!`);
  console.log(`   📊 Estado final:`);
  console.log(`      • Level: 1 | XP: 0`);
  console.log(`      • Roteiros ativos: 0/5 slots`);
  console.log(`      • Criações mensais: 0/15 (com IA)`);
  console.log(`      • Fotos: sem upload (plano free)`);
  console.log(`      • Plano: FREE\n`);
}

/**
 * Deletar usuários de teste
 */
async function deleteTestUsers(db) {
  console.log('🗑️  Deletando usuários de teste...');
  
  const testUsersResult = await db.collection('users').deleteMany({
    email: { $regex: /cascade-test|@test\.com/i }
  });
  
  // Deletar subscriptions órfãs de testes
  await db.collection('subscriptions').deleteMany({
    user: { $nin: await db.collection('users').find({}).map(u => u._id).toArray() }
  });
  
  console.log(`   ✅ ${testUsersResult.deletedCount} usuário(s) de teste deletado(s)\n`);
  
  return testUsersResult.deletedCount;
}

module.exports = {
  resetSubscriptionToFree,
  resetUserStats,
  deleteUserItineraries,
  deleteUserAchievements,
  resetUserToFree,
  deleteTestUsers,
};
