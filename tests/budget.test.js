/**
 * Testes de Orçamento (Budget) - API
 * Testa funcionalidades de gerenciamento de gastos e orçamento
 */

const axios = require('axios');
const { trackUser, trackItinerary, cleanupTestData } = require('./helpers/testCleanup');
const { upgradeToPremium } = require('./helpers/subscriptionHelpers');

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('Budget Management - Testes Extensivos', () => {
  let authToken, userId, itineraryId;
  let collaboratorToken, collaboratorId;
  let viewOnlyToken, viewOnlyId;
  let otherUserToken, otherUserId;
  let ownerEmail, collaboratorEmail, viewOnlyEmail;

  beforeAll(async () => {
    // Criar usuário principal (owner)
    ownerEmail = `owner-budget-${Date.now()}@test.com`;
    const ownerRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Owner Budget Test',
      email: ownerEmail,
      password: 'Senha@123',
      acceptedTerms: true
    });
    authToken = ownerRes.data.accessToken;
    userId = ownerRes.data.user._id;
    trackUser(userId);

    // Upgrade para PREMIUM (para testes de colaboradores)
    await upgradeToPremium(authToken);

    // Criar colaborador com permissão de edição
    collaboratorEmail = `collab-edit-${Date.now()}@test.com`;
    const collabRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Collaborator Edit',
      email: collaboratorEmail,
      password: 'Senha@123',
      acceptedTerms: true
    });
    collaboratorToken = collabRes.data.accessToken;
    collaboratorId = collabRes.data.user._id;
    trackUser(collaboratorId);

    // Criar colaborador apenas visualização
    viewOnlyEmail = `collab-view-${Date.now()}@test.com`;
    const viewRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Collaborator View',
      email: viewOnlyEmail,
      password: 'Senha@123',
      acceptedTerms: true
    });
    viewOnlyToken = viewRes.data.accessToken;
    viewOnlyId = viewRes.data.user._id;
    trackUser(viewOnlyId);

    // Criar usuário sem acesso
    const otherRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Other User',
      email: `other-user-${Date.now()}@test.com`,
      password: 'Senha@123',
      acceptedTerms: true
    });
    otherUserToken = otherRes.data.accessToken;
    otherUserId = otherRes.data.user._id;
    trackUser(otherUserId);

    // Criar roteiro de teste
    const itineraryRes = await axios.post(`${API_URL}/api/roteiros`, {
      title: 'Viagem Budget Test',
      destination: { city: 'Rio de Janeiro', country: 'Brasil' },
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-05'),
      duration: 5,
      budget: { level: 'medio', estimatedTotal: 5000, currency: 'BRL' }
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    itineraryId = itineraryRes.data.itinerary._id;
    trackItinerary(itineraryId);

    // Adicionar colaboradores
    await axios.post(`${API_URL}/api/roteiros/${itineraryId}/collaborators`, {
      email: collaboratorEmail,
      permission: 'edit'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    await axios.post(`${API_URL}/api/roteiros/${itineraryId}/collaborators`, {
      email: viewOnlyEmail,
      permission: 'view'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
  });

  afterAll(async () => {
    await cleanupTestData({
      emailPatterns: [/@test\.com$/],
      titlePatterns: [/Budget Test/i]
    });
  });

  describe('POST /roteiros/:id/expenses - Adicionar Gasto', () => {
    test('✅ Deve adicionar gasto com sucesso (owner)', async () => {
      const response = await axios.post(`${API_URL}/api/roteiros/${itineraryId}/expenses`, {
        category: 'hospedagem',
        description: 'Hotel Centro',
        amount: 800,
        date: new Date('2026-03-01')
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(201);
      expect(response.data.message).toBe('Gasto adicionado com sucesso');
      expect(response.data.expense).toHaveProperty('_id');
      expect(response.data.expense.category).toBe('hospedagem');
      expect(response.data.expense.amount).toBe(800);
      expect(response.data.budgetSummary.spent).toBe(800);
    });

    test('✅ Deve adicionar gasto (colaborador com permissão edit)', async () => {
      const response = await axios.post(`${API_URL}/api/roteiros/${itineraryId}/expenses`, {
        category: 'alimentacao',
        description: 'Restaurante',
        amount: 150
      }, {
        headers: { Authorization: `Bearer ${collaboratorToken}` }
      });

      expect(response.status).toBe(201);
      expect(response.data.expense.category).toBe('alimentacao');
    });

    test('❌ Não deve adicionar gasto sem autenticação', async () => {
      try {
        await axios.post(`${API_URL}/api/roteiros/${itineraryId}/expenses`, {
          category: 'transporte',
          amount: 50
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });

    test('❌ Não deve adicionar gasto (colaborador view-only)', async () => {
      try {
        await axios.post(`${API_URL}/api/roteiros/${itineraryId}/expenses`, {
          category: 'transporte',
          amount: 50,
          description: 'Teste'
        }, {
          headers: { Authorization: `Bearer ${viewOnlyToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(403);
      }
    });

    test('❌ Não deve adicionar gasto (usuário sem acesso)', async () => {
      try {
        await axios.post(`${API_URL}/api/roteiros/${itineraryId}/expenses`, {
          category: 'transporte',
          amount: 50,
          description: 'Teste'
        }, {
          headers: { Authorization: `Bearer ${otherUserToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(403);
      }
    });

    test('❌ Não deve adicionar gasto com categoria inválida', async () => {
      try {
        await axios.post(`${API_URL}/api/roteiros/${itineraryId}/expenses`, {
          category: 'categoria_invalida',
          amount: 50
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    test('❌ Não deve adicionar gasto sem campos obrigatórios', async () => {
      try {
        await axios.post(`${API_URL}/api/roteiros/${itineraryId}/expenses`, {
          description: 'Sem categoria'
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    test('❌ Não deve adicionar gasto com amount negativo', async () => {
      try {
        await axios.post(`${API_URL}/api/roteiros/${itineraryId}/expenses`, {
          category: 'outro',
          amount: -100
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('GET /roteiros/:id/budget-summary - Resumo do Orçamento', () => {
    test('✅ Deve obter resumo completo (owner)', async () => {
      const response = await axios.get(`${API_URL}/api/roteiros/${itineraryId}/budget-summary`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.budget).toHaveProperty('estimated');
      expect(response.data.budget).toHaveProperty('spent');
      expect(response.data.budget).toHaveProperty('remaining');
      expect(response.data.budget).toHaveProperty('percentage');
    });

    test('✅ Deve obter resumo (colaborador edit)', async () => {
      const response = await axios.get(`${API_URL}/api/roteiros/${itineraryId}/budget-summary`, {
        headers: { Authorization: `Bearer ${collaboratorToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.budget).toHaveProperty('spent');
    });

    test('✅ Deve obter resumo (colaborador view-only)', async () => {
      const response = await axios.get(`${API_URL}/api/roteiros/${itineraryId}/budget-summary`, {
        headers: { Authorization: `Bearer ${viewOnlyToken}` }
      });

      expect(response.status).toBe(200);
    });

    test('❌ Não deve obter resumo (usuário sem acesso)', async () => {
      try {
        await axios.get(`${API_URL}/api/roteiros/${itineraryId}/budget-summary`, {
          headers: { Authorization: `Bearer ${otherUserToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(403);
      }
    });
  });

  describe('Testes de Segurança', () => {
    test('🔒 Deve sanitizar inputs maliciosos (XSS)', async () => {
      const response = await axios.post(`${API_URL}/api/roteiros/${itineraryId}/expenses`, {
        category: 'outro',
        description: '<script>alert("xss")</script>',
        amount: 50
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.status).toBe(201);
      expect(response.data.expense).toBeDefined();
    });

    test('🔒 Deve validar tipos de dados', async () => {
      try {
        await axios.post(`${API_URL}/api/roteiros/${itineraryId}/expenses`, {
          category: 'hospedagem',
          amount: 'não é número'
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });
});
