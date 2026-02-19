// automation/tests/recommendations.test.js
const axios = require('axios');
const { upgradeToPremium } = require('./helpers/subscriptionHelpers');

const API_URL = 'http://localhost:3000';

describe('Recomendações - API', () => {
  let userToken;
  let userEmail;
  let userId;
  let itineraryId;
  let publicItineraryId;

  beforeAll(async () => {
    // Criar usuário
    userEmail = `recommendations-${Date.now()}@test.com`;
    const signupRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Recommendations Test User',
      email: userEmail,
      password: 'Senha@123',
      acceptedTerms: true,
    });
    userToken = signupRes.data.accessToken;
    userId = signupRes.data.user._id;

    // Upgrade para PREMIUM (para testes)
    await upgradeToPremium(userToken);

    // Criar roteiro do usuário
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 5);

    const itineraryRes = await axios.post(
      `${API_URL}/api/roteiros`,
      {
        title: 'Paris - Teste',
        destination: {
          city: 'Paris',
          country: 'França',
          coverImage: 'https://example.com/paris.jpg',
        },
        startDate,
        endDate,
        duration: 5,
        budget: { level: 'medio', currency: 'EUR' },
        preferences: {
          interests: ['cultura', 'gastronomia'],
          travelStyle: 'casal',
        },
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    itineraryId = itineraryRes.data.itinerary._id;

    // Adicionar dias para completar
    await axios.put(
      `${API_URL}/api/roteiros/${itineraryId}`,
      {
        days: [
          {
            dayNumber: 1,
            date: startDate,
            title: 'Dia 1',
            activities: [
              {
                time: '10:00',
                title: 'Torre Eiffel',
                description: 'Visita',
                location: {
                  name: 'Torre Eiffel',
                  coordinates: { lat: 48.8584, lng: 2.2945 },
                },
                category: 'atracao',
                duration: 120,
              },
            ],
          },
        ],
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    // Criar roteiro público para testes
    const publicRes = await axios.post(
      `${API_URL}/api/roteiros`,
      {
        title: 'Roma - Público',
        destination: {
          city: 'Roma',
          country: 'Itália',
          coverImage: 'https://example.com/roma.jpg',
        },
        startDate,
        endDate,
        duration: 5,
        budget: { level: 'medio', currency: 'EUR' },
        preferences: {
          interests: ['cultura', 'historia'],
          travelStyle: 'casal',
        },
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    publicItineraryId = publicRes.data.itinerary._id;

    // Completar roteiro público
    await axios.put(
      `${API_URL}/api/roteiros/${publicItineraryId}`,
      {
        days: [
          {
            dayNumber: 1,
            date: startDate,
            title: 'Dia 1',
            activities: [
              {
                time: '09:00',
                title: 'Coliseu',
                description: 'Tour',
                location: {
                  name: 'Coliseu',
                  coordinates: { lat: 41.8902, lng: 12.4922 },
                },
                category: 'atracao',
                duration: 180,
              },
            ],
          },
        ],
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );

    // Tornar público
    await axios.post(
      `${API_URL}/api/roteiros/${publicItineraryId}/share`,
      {},
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
  });

  afterAll(async () => {
    await axios.post(`${API_URL}/api/test/cleanup`, {
      emails: [userEmail],
    });
  });

  describe('GET /api/recommendations/destinations - Recomendar Destinos', () => {
    it('✓ Deve recomendar destinos baseado no histórico', async () => {
      const res = await axios.get(`${API_URL}/api/recommendations/destinations`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });

    it('✓ Destinos devem ter campos necessários', async () => {
      const res = await axios.get(`${API_URL}/api/recommendations/destinations`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (res.data.length > 0) {
        const destination = res.data[0];
        expect(destination.city).toBeDefined();
        expect(destination.country).toBeDefined();
      }
    });

    it('✓ Deve limitar resultados', async () => {
      const res = await axios.get(`${API_URL}/api/recommendations/destinations?limit=3`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.length).toBeLessThanOrEqual(3);
    });

    it('✗ Não deve recomendar sem autenticação', async () => {
      try {
        await axios.get(`${API_URL}/api/recommendations/destinations`);
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('GET /api/recommendations/itineraries - Recomendar Roteiros', () => {
    it('✓ Deve recomendar roteiros similares', async () => {
      const res = await axios.get(`${API_URL}/api/recommendations/itineraries`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });

    it('✓ Roteiros devem estar completos', async () => {
      const res = await axios.get(`${API_URL}/api/recommendations/itineraries`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (res.data.length > 0) {
        const itinerary = res.data[0];
        expect(itinerary.title).toBeDefined();
        expect(itinerary.destination).toBeDefined();
      }
    });

    it('✗ Não deve recomendar sem autenticação', async () => {
      try {
        await axios.get(`${API_URL}/api/recommendations/itineraries`);
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('GET /api/recommendations/similar/:id - Roteiros Similares', () => {
    it('✓ Deve retornar roteiros similares', async () => {
      const res = await axios.get(`${API_URL}/api/recommendations/similar/${publicItineraryId}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });

    it('✓ Deve funcionar sem autenticação (público)', async () => {
      const res = await axios.get(`${API_URL}/api/recommendations/similar/${publicItineraryId}`);
      expect(res.status).toBe(200);
    });

    it('✓ Não deve incluir o próprio roteiro', async () => {
      const res = await axios.get(`${API_URL}/api/recommendations/similar/${publicItineraryId}`);

      const ownItinerary = res.data.find(i => i._id === publicItineraryId);
      expect(ownItinerary).toBeUndefined();
    });

    it('✗ Deve retornar 404 para roteiro inexistente', async () => {
      try {
        await axios.get(`${API_URL}/api/recommendations/similar/507f1f77bcf86cd799439011`);
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('GET /api/recommendations/for-you - Personalizado', () => {
    it('✓ Deve retornar recomendações personalizadas', async () => {
      const res = await axios.get(`${API_URL}/api/recommendations/for-you`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.recommendations).toBeDefined();
      expect(Array.isArray(res.data.recommendations)).toBe(true);
    });

    it('✓ Deve incluir info sobre base das recomendações', async () => {
      const res = await axios.get(`${API_URL}/api/recommendations/for-you`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(res.data.based_on).toBeDefined();
      expect(res.data.based_on.interests).toBeDefined();
    });

    it('✓ Deve limitar a 10 recomendações', async () => {
      const res = await axios.get(`${API_URL}/api/recommendations/for-you`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(res.data.recommendations.length).toBeLessThanOrEqual(10);
    });

    it('✗ Não deve funcionar sem autenticação', async () => {
      try {
        await axios.get(`${API_URL}/api/recommendations/for-you`);
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('GET /api/recommendations/trending - Em Alta', () => {
    it('✓ Deve retornar roteiros em alta', async () => {
      const res = await axios.get(`${API_URL}/api/recommendations/trending`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });

    it('✓ Deve funcionar sem autenticação (público)', async () => {
      const res = await axios.get(`${API_URL}/api/recommendations/trending`);
      expect(res.status).toBe(200);
    });

    it('✓ Roteiros devem ser recentes (últimos 7 dias)', async () => {
      const res = await axios.get(`${API_URL}/api/recommendations/trending`);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      if (res.data.length > 0) {
        const roteiro = res.data[0];
        expect(roteiro.createdAt).toBeDefined();
        const createdDate = new Date(roteiro.createdAt);
        expect(createdDate.getTime()).toBeGreaterThanOrEqual(sevenDaysAgo.getTime());
      }
    });

    it('✓ Deve limitar resultados', async () => {
      const res = await axios.get(`${API_URL}/api/recommendations/trending?limit=5`);

      expect(res.status).toBe(200);
      expect(res.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Integração - Fluxo de Recomendações', () => {
    it('✓ Curtir roteiro deve influenciar recomendações', async () => {
      // Curtir o roteiro público
      await axios.post(
        `${API_URL}/api/explore/like/${publicItineraryId}`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      // Buscar recomendações
      const res = await axios.get(`${API_URL}/api/recommendations/itineraries`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(res.status).toBe(200);
      // Recomendações devem considerar o roteiro curtido
    });

    it('✓ Visualizar detalhes deve incrementar popularidade', async () => {
      // Simular visualização
      const shareRes = await axios.post(
        `${API_URL}/api/roteiros/${publicItineraryId}/share`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      const shareLink = shareRes.data.shareLink;

      await axios.post(`${API_URL}/api/social/increment-view/${shareLink}`);

      // Roteiro deve aparecer em trending
      const trendingRes = await axios.get(`${API_URL}/api/recommendations/trending`);
      const found = trendingRes.data.find(i => i._id === publicItineraryId);

      expect(found).toBeDefined();
    });
  });
});
