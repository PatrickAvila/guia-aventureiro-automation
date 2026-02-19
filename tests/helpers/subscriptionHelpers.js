// automation/tests/helpers/subscriptionHelpers.js
// Helpers para gerenciar subscriptions durante testes

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Faz upgrade de um usuário para PREMIUM (para testes)
 */
async function upgradeToPremium(token) {
  try {
    // Confirmar upgrade diretamente (bypass do Stripe para testes)
    const response = await axios.post(
      `${API_URL}/api/subscriptions/confirm-upgrade`,
      { 
        targetPlan: 'premium',
        billingCycle: 'monthly'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao fazer upgrade para PREMIUM:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Faz upgrade de um usuário para PRO (para testes)
 */
async function upgradeToPro(token) {
  try {
    // Confirmar upgrade diretamente (bypass do Stripe para testes)
    const response = await axios.post(
      `${API_URL}/api/subscriptions/confirm-upgrade`,
      { 
        targetPlan: 'pro',
        billingCycle: 'monthly'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao fazer upgrade para PRO:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Obtém informações da subscription atual
 */
async function getSubscription(token) {
  try {
    const response = await axios.get(
      `${API_URL}/api/subscriptions/my-subscription`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao obter subscription:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Verifica se usuário pode usar uma feature
 */
async function canUseFeature(token, feature) {
  try {
    const subscription = await getSubscription(token);
    return subscription.features?.[feature] === true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  upgradeToPremium,
  upgradeToPro,
  getSubscription,
  canUseFeature,
};
