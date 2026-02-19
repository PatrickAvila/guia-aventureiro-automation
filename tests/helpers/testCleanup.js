// automation/tests/helpers/testCleanup.js
// Sistema de limpeza automática para testes de integração

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Limpa todos os dados de teste do banco via API
 * IMPORTANTE: Esta é uma rota administrativa que deve existir apenas em ambiente de teste
 */
async function cleanupTestData(options = {}) {
  const {
    emailPatterns = [/@example\.com$/i, /@test\.com$/i],
    titlePatterns = [/test/i, /teste/i],
    adminToken = null
  } = options;

  try {
    console.log('🗑️  Iniciando limpeza de dados de teste via API...');

    // Se não tiver rota administrativa, usar abordagem alternativa
    // Vamos criar uma rota especial no backend para limpeza em modo teste
    const cleanupEndpoint = `${API_URL}/api/test/cleanup`;
    
    try {
      const response = await axios.post(cleanupEndpoint, {
        emailPatterns: emailPatterns.map(p => p.source || p.toString()),
        titlePatterns: titlePatterns.map(p => p.source || p.toString())
      }, {
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
        timeout: 10000
      });

      if (response.status === 200) {
        console.log(`🗑️  Limpeza: ${response.data.deletedUsers || 0} usuários, ${response.data.deletedItineraries || 0} roteiros removidos`);
        return {
          users: response.data.deletedUsers || 0,
          itineraries: response.data.deletedItineraries || 0
        };
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.warn('⚠️  Rota de limpeza não encontrada - use npm run test:force-clean no backend');
      } else {
        console.warn('⚠️  Não foi possível executar limpeza automática:', error.message);
      }
    }

    return { users: 0, itineraries: 0 };
  } catch (error) {
    console.error('❌ Erro na limpeza de dados:', error.message);
    return { users: 0, itineraries: 0 };
  }
}

/**
 * Coleta todos os IDs de usuários criados durante os testes
 * para limpeza manual
 */
const createdUserIds = new Set();
const createdItineraryIds = new Set();

function trackUser(userId) {
  if (userId) createdUserIds.add(userId);
}

function trackItinerary(itineraryId) {
  if (itineraryId) createdItineraryIds.add(itineraryId);
}

function getTrackedIds() {
  return {
    users: Array.from(createdUserIds),
    itineraries: Array.from(createdItineraryIds)
  };
}

function clearTracking() {
  createdUserIds.clear();
  createdItineraryIds.clear();
}

/**
 * Limpa usuário específico via API de delete
 */
async function deleteUser(userId, token) {
  try {
    await axios.delete(`${API_URL}/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`🗑️  Usuário ${userId} removido`);
  } catch (error) {
    // Ignorar se já foi deletado
    if (error.response && error.response.status !== 404) {
      console.warn(`⚠️  Não foi possível deletar usuário ${userId}`);
    }
  }
}

/**
 * Limpa roteiro específico via API de delete
 */
async function deleteItinerary(itineraryId, token) {
  try {
    await axios.delete(`${API_URL}/api/roteiros/${itineraryId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`🗑️  Roteiro ${itineraryId} removido`);
  } catch (error) {
    // Ignorar se já foi deletado
    if (error.response && error.response.status !== 404) {
      console.warn(`⚠️  Não foi possível deletar roteiro ${itineraryId}`);
    }
  }
}

module.exports = {
  cleanupTestData,
  trackUser,
  trackItinerary,
  getTrackedIds,
  clearTracking,
  deleteUser,
  deleteItinerary
};
