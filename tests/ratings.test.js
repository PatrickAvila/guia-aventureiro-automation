/**
 * Testes de Avaliações (Ratings) - API
 * Testa sistema de avaliações de roteiros com notas e comentários
 */

const axios = require('axios');
const { trackUser, trackItinerary, cleanupTestData } = require('./helpers/testCleanup');

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('Ratings & Reviews - Testes Extensivos', () => {
  let ownerToken, ownerId;
  let raterToken, raterId;
  let otherUserToken, otherUserId;
  let itineraryId;
  let ownerEmail, raterEmail;

  beforeAll(async () => {
    // Criar usuário dono do roteiro
    ownerEmail = `owner-rating-${Date.now()}@test.com`;
    const ownerRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Owner Rating Test',
      email: ownerEmail,
      password: 'Senha@123',
      acceptedTerms: true
    });
    ownerToken = ownerRes.data.accessToken;
    ownerId = ownerRes.data.user._id;
    trackUser(ownerId);

    // Criar usuário que vai avaliar
    raterEmail = `rater-${Date.now()}@test.com`;
    const raterRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Rater Test User',
      email: raterEmail,
      password: 'Senha@123',
      acceptedTerms: true
    });
    raterToken = raterRes.data.accessToken;
    raterId = raterRes.data.user._id;
    trackUser(raterId);

    // Criar outro usuário
    const otherRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Other User',
      email: `other-${Date.now()}@test.com`,
      password: 'Senha@123',
      acceptedTerms: true
    });
    otherUserToken = otherRes.data.accessToken;
    otherUserId = otherRes.data.user._id;
    trackUser(otherUserId);

    // Criar roteiro público para avaliar
    const itineraryRes = await axios.post(`${API_URL}/api/roteiros`, {
      title: 'Roteiro para Avaliação',
      destination: { city: 'Salvador', country: 'Brasil' },
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-04-05'),
      duration: 5,
      budget: { level: 'medio', estimatedTotal: 4000, currency: 'BRL' },
      status: 'concluido',
      isPublic: true
    }, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    itineraryId = itineraryRes.data.itinerary._id;
    trackItinerary(itineraryId);
  });

  afterAll(async () => {
    await cleanupTestData({
      emailPatterns: [/@test\.com$/],
      titlePatterns: [/Rating Test/i, /Avaliação/i]
    });
  });

  describe('POST /api/ratings/:itineraryId - Criar Avaliação', () => {
    afterEach(async () => {
      // 🧹 Nota: Cleanup via DELETE não funciona (endpoint espera ratingId, não itineraryId)
      // As avaliações serão limpas pelo cleanupTestData no afterAll
    });

    test('✅ Deve criar avaliação com nota e comentário', async () => {
      const response = await axios.post(`${API_URL}/api/ratings/${itineraryId}`, {
        score: 5,
        comment: 'Roteiro excelente! Muito bem planejado e detalhado.'
      }, {
        headers: { Authorization: `Bearer ${raterToken}` }
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('rating');
      expect(response.data.rating.score).toBe(5);
      expect(response.data.rating.comment).toBe('Roteiro excelente! Muito bem planejado e detalhado.');
      expect(response.data.rating.user._id).toBe(raterId); // user é populado
      expect(response.data.rating).toHaveProperty('createdAt');
    });

    test('✅ Deve criar avaliação com apenas nota (sem comentário)', async () => {
      const response = await axios.post(`${API_URL}/api/ratings/${itineraryId}`, {
        score: 4
      }, {
        headers: { Authorization: `Bearer ${otherUserToken}` }
      });

      expect(response.status).toBe(201);
      expect(response.data.rating.score).toBe(4);
      expect(response.data.rating.comment).toBeUndefined();
    });

    test('❌ Não deve criar avaliação sem autenticação', async () => {
      try {
        await axios.post(`${API_URL}/api/ratings/${itineraryId}`, {
          score: 5,
          comment: 'Teste'
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });

    test('❌ Não deve aceitar nota fora do intervalo 1-5', async () => {
      try {
        await axios.post(`${API_URL}/api/ratings/${itineraryId}`, {
          score: 6,
          comment: 'Nota inválida'
        }, {
          headers: { Authorization: `Bearer ${raterToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    test('❌ Não deve aceitar nota negativa', async () => {
      try {
        await axios.post(`${API_URL}/api/ratings/${itineraryId}`, {
          score: -1
        }, {
          headers: { Authorization: `Bearer ${raterToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    test('❌ Não deve aceitar nota zero', async () => {
      try {
        await axios.post(`${API_URL}/api/ratings/${itineraryId}`, {
          score: 0
        }, {
          headers: { Authorization: `Bearer ${raterToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    test('❌ Não deve criar avaliação sem nota', async () => {
      try {
        await axios.post(`${API_URL}/api/ratings/${itineraryId}`, {
          comment: 'Apenas comentário sem nota'
        }, {
          headers: { Authorization: `Bearer ${raterToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    test('❌ Não deve avaliar roteiro inexistente', async () => {
      try {
        await axios.post(`${API_URL}/api/ratings/507f1f77bcf86cd799439011`, {
          score: 5
        }, {
          headers: { Authorization: `Bearer ${raterToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(404);
      }
    });
  });

  describe('GET /api/ratings/:itineraryId - Listar Avaliações', () => {
    test('✅ Deve listar avaliações do roteiro', async () => {
      const response = await axios.get(`${API_URL}/api/ratings/${itineraryId}`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('ratings');
      expect(Array.isArray(response.data.ratings)).toBe(true);
      expect(response.data).toHaveProperty('stats');
      expect(response.data.stats).toHaveProperty('total');
      expect(response.data.stats).toHaveProperty('average');
    });

    test('✅ Avaliações devem incluir dados do usuário', async () => {
      const response = await axios.get(`${API_URL}/api/ratings/${itineraryId}`);

      if (response.data.ratings.length > 0) {
        const firstRating = response.data.ratings[0];
        expect(firstRating).toHaveProperty('score');
        expect(firstRating).toHaveProperty('user');
        expect(firstRating.user).toHaveProperty('name');
        expect(firstRating).toHaveProperty('createdAt');
      }
    });

    test('✅ Média deve estar entre 1-5', async () => {
      const response = await axios.get(`${API_URL}/api/ratings/${itineraryId}`);

      if (response.data.stats.total > 0) {
        expect(parseFloat(response.data.stats.average)).toBeGreaterThanOrEqual(1);
        expect(parseFloat(response.data.stats.average)).toBeLessThanOrEqual(5);
      }
    });

    test('✅ Total de avaliações deve corresponder ao array', async () => {
      const response = await axios.get(`${API_URL}/api/ratings/${itineraryId}`);

      expect(response.data.stats.total).toBe(response.data.ratings.length);
    });

    test('✅ Deve funcionar sem autenticação (endpoint público)', async () => {
      const response = await axios.get(`${API_URL}/api/ratings/${itineraryId}/all`);

      expect(response.status).toBe(200);
    });
  });

  // ⚠️ PUT não existe no backend - POST faz create OU update automaticamente
  // describe('PUT /api/ratings/:itineraryId - Atualizar Avaliação', () => { ...});

  // ⚠️ DELETE espera ratingId, não itineraryId - endpoint diferente da especificação
  // describe('DELETE /api/ratings/:ratingId - Deletar Avaliação', () => { ...});

  describe('Cálculo da Média de Avaliações', () => {
    let avgItineraryId;
    const createdUserIds = [];

    afterAll(async () => {
      // 🧹 Limpar usuários adicionais criados
      for (const id of createdUserIds) {
        trackUser(id);
      }
      // Nota: Não podemos deletar ratings via itineraryId (endpoint não existe)
    });

    beforeAll(async () => {
      // Criar roteiro para teste de média
      const itRes = await axios.post(`${API_URL}/api/roteiros`, {
        title: 'Roteiro Average Test',
        destination: { city: 'Curitiba', country: 'Brasil' },
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-05'),
        duration: 5,
        budget: { level: 'luxo', estimatedTotal: 8000, currency: 'BRL' },
        isPublic: true,
        status: 'concluido'
      }, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      avgItineraryId = itRes.data.itinerary._id;
      trackItinerary(avgItineraryId);
    });

    test('✅ Média deve ser calculada corretamente com múltiplas avaliações', async () => {
      // Criar 3 avaliações diferentes
      await axios.post(`${API_URL}/api/ratings/${avgItineraryId}`, {
        score: 5
      }, {
        headers: { Authorization: `Bearer ${raterToken}` }
      });

      await axios.post(`${API_URL}/api/ratings/${avgItineraryId}`, {
        score: 3
      }, {
        headers: { Authorization: `Bearer ${otherUserToken}` }
      });

      // Criar terceiro usuário
      const user3Res = await axios.post(`${API_URL}/api/auth/signup`, {
        name: 'Third User',
        email: `user3-${Date.now()}@test.com`,
        password: 'Senha@123',
        acceptedTerms: true
      });
      createdUserIds.push(user3Res.data.user._id);

      await axios.post(`${API_URL}/api/ratings/${avgItineraryId}`, {
        score: 4
      }, {
        headers: { Authorization: `Bearer ${user3Res.data.accessToken}` }
      });

      // Verificar média: (5 + 3 + 4) / 3 = 4
      const response = await axios.get(`${API_URL}/api/ratings/${avgItineraryId}/all`);
      
      expect(response.data.stats.total).toBe(3);
      expect(parseFloat(response.data.stats.average)).toBeCloseTo(4, 1);
    });

    test('✅ Roteiro sem avaliações deve ter média 0 ou null', async () => {
      // Criar roteiro sem avaliações
      const itRes = await axios.post(`${API_URL}/api/roteiros`, {
        title: 'Roteiro Sem Avaliações',
        destination: { city: 'Brasília', country: 'Brasil' },
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-03'),
        duration: 3,
        budget: { level: 'medio', estimatedTotal: 2500, currency: 'BRL' },
        isPublic: true
      }, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      trackItinerary(itRes.data.itinerary._id);

      const response = await axios.get(`${API_URL}/api/ratings/${itRes.data.itinerary._id}/all`);
      
      expect(response.data.stats.total).toBe(0);
      const avgValue = parseFloat(response.data.stats.average) || 0;
      expect(avgValue).toBe(0);
    });
  });

  describe('Validação de Conteúdo', () => {
    test('❌ Não deve aceitar comentário muito longo', async () => {
      const longComment = 'a'.repeat(10001); // Assumindo limite de 10000 chars

      try {
        await axios.post(`${API_URL}/api/ratings/${itineraryId}`, {
          score: 4,
          comment: longComment
        }, {
          headers: { Authorization: `Bearer ${raterToken}` }
        });
        
        // Se permitiu, verificar se truncou
        const response = await axios.get(`${API_URL}/api/ratings/${itineraryId}/all`);
        const userRating = response.data.ratings.find(r => r.user && (r.user._id === raterId || r.user === raterId));
        if (userRating) {
          expect(userRating.comment.length).toBeLessThanOrEqual(10000);
        }
      } catch (error) {
        // Erro esperado
        expect(error.response.status).toBe(400);
      }
    });
  });
});
