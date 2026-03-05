// automation/helpers/queries.js
// Funções de query reutilizáveis

const { ObjectId } = require('mongodb');

/**
 * Buscar usuário por email
 */
async function getUserByEmail(db, email) {
  return await db.collection('users').findOne({ email });
}

/**
 * Buscar subscription de usuário
 */
async function getUserSubscription(db, userId) {
  return await db.collection('subscriptions').findOne({ user: userId });
}

/**
 * Buscar todos os roteiros de um usuário
 */
async function getUserItineraries(db, userId) {
  return await db.collection('itineraries').find({ owner: userId }).toArray();
}

/**
 * Buscar todos os achievements de um usuário
 */
async function getUserAchievements(db, userId) {
  return await db.collection('achievements').find({ user: userId }).toArray();
}

/**
 * Contar roteiros de um usuário
 */
async function countUserItineraries(db, userId) {
  return await db.collection('itineraries').countDocuments({ owner: userId });
}

/**
 * Contar roteiros órfãos (sem dono)
 */
async function findOrphanItineraries(db) {
  const userIds = await db.collection('users').distinct('_id');
  
  return await db.collection('itineraries').find({
    owner: { $nin: userIds }
  }).toArray();
}

/**
 * Listar todos os usuários com informações básicas
 */
async function listAllUsers(db) {
  const users = await db.collection('users').find({}).toArray();
  const result = [];
  
  for (const user of users) {
    const subscription = await getUserSubscription(db, user._id);
    const itineraryCount = await countUserItineraries(db, user._id);
    
    result.push({
      id: user._id,
      name: user.name,
      email: user.email,
      plan: subscription?.plan || 'free',
      itineraries: itineraryCount,
      level: user.stats?.level || 1,
      xp: user.stats?.xp || 0,
      isPremium: user.isPremium,
      createdAt: user.createdAt,
    });
  }
  
  return result;
}

/**
 * Buscar usuário por ObjectId ou email
 */
async function getUser(db, identifier) {
  // Se parece ObjectId, busca por ID
  if (ObjectId.isValid(identifier) && identifier.length === 24) {
    return await db.collection('users').findOne({ _id: new ObjectId(identifier) });
  }
  
  // Caso contrário, busca por email
  return await getUserByEmail(db, identifier);
}

/**
 * Verificar status de usage de subscription
 */
async function getSubscriptionUsage(db, userId) {
  const subscription = await getUserSubscription(db, userId);
  
  if (!subscription) {
    return null;
  }
  
  return {
    plan: subscription.plan,
    status: subscription.status,
    itineraries: {
      current: subscription.usage?.itineraries?.current || 0,
      limit: subscription.usage?.itineraries?.limit || 0,
    },
    aiGenerations: {
      current: subscription.usage?.aiGenerations?.current || 0,
      limit: subscription.usage?.aiGenerations?.limit || 0,
      lastReset: subscription.usage?.aiGenerations?.lastReset,
    },
    monthlyCreations: {
      count: subscription.usage?.monthlyCreations?.count || 0,
      limit: subscription.usage?.monthlyCreations?.limit || 0,
      lastReset: subscription.usage?.monthlyCreations?.lastReset,
    },
    photos: {
      current: subscription.usage?.photos?.current || 0,
      limit: subscription.usage?.photos?.limit || 0,
    },
  };
}

module.exports = {
  getUserByEmail,
  getUserSubscription,
  getUserItineraries,
  getUserAchievements,
  countUserItineraries,
  findOrphanItineraries,
  listAllUsers,
  getUser,
  getSubscriptionUsage,
};
