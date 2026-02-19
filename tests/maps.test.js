// automation/tests/maps.test.js
/**
 * Testes de Integração - API de Mapas
 * 
 * Testa funcionalidades:
 * - Obter mapa completo do roteiro
 * - Obter mapa de um dia específico
 * - Buscar pontos próximos
 * - Cálculo de distância e tempo de viagem
 * - Permissões de acesso
 */

const axios = require('axios');
const { trackUser, trackItinerary, cleanupTestData } = require('./helpers/testCleanup');
const { upgradeToPremium } = require('./helpers/subscriptionHelpers');

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('Mapas - API', () => {
  let ownerToken, ownerEmail, ownerId;
  let collabToken, collabEmail, collabId;
  let otherUserToken, otherUserEmail;
  let itineraryId;

  beforeAll(async () => {
    // Criar usuário proprietário
    ownerEmail = `owner-map-${Date.now()}@test.com`;
    const ownerRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Owner Map Test',
      email: ownerEmail,
      password: 'Senha@123',
      acceptedTerms: true,
    });
    ownerToken = ownerRes.data.accessToken;
    ownerId = ownerRes.data.user._id;
    trackUser(ownerEmail, ownerId);

    // Upgrade para PREMIUM (para adicionar colaboradores)
    await upgradeToPremium(ownerToken);

    // Criar colaborador
    collabEmail = `collab-map-${Date.now()}@test.com`;
    const collabRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Collab Map Test',
      email: collabEmail,
      password: 'Senha@123',
      acceptedTerms: true,
    });
    collabToken = collabRes.data.accessToken;
    collabId = collabRes.data.user._id;
    trackUser(collabEmail, collabId);

    // Criar outro usuário (sem acesso)
    otherUserEmail = `other-map-${Date.now()}@test.com`;
    const otherRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Other Map Test',
      email: otherUserEmail,
      password: 'Senha@123',
      acceptedTerms: true,
    });
    otherUserToken = otherRes.data.accessToken;
    trackUser(otherUserEmail, otherRes.data.user._id);

    // Criar roteiro básico
    const createRes = await axios.post(
      `${API_URL}/api/roteiros`,
      {
        title: 'Roteiro Teste Mapa São Paulo',
        destination: {
          city: 'São Paulo',
          country: 'Brasil',
        },
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 259200000).toISOString(),
        duration: 2,
      },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    itineraryId = createRes.data.itinerary._id;
    trackItinerary(createRes.data.itinerary.title, itineraryId);

    // Atualizar roteiro com dias e atividades com coordenadas
    await axios.put(
      `${API_URL}/api/roteiros/${itineraryId}`,
      {
        days: [
          {
            date: new Date(Date.now() + 86400000).toISOString(),
            dayNumber: 1,
            title: 'Dia 1 - Centro',
            activities: [
              {
                time: '09:00',
                title: 'Museu do Ipiranga',
                description: 'Visita ao museu histórico',
                location: {
                  name: 'Museu do Ipiranga',
                  address: 'Parque da Independência, São Paulo',
                  coordinates: { lat: -23.585678, lng: -46.609123 },
                },
                category: 'atracao',
                duration: 120,
                estimatedCost: 30,
              },
              {
                time: '12:00',
                title: 'Almoço no Mercadão',
                description: 'Almoço tradicional',
                location: {
                  name: 'Mercado Municipal',
                  address: 'Rua da Cantareira, 306',
                  coordinates: { lat: -23.541040, lng: -46.630180 },
                },
                category: 'alimentacao',
                duration: 90,
                estimatedCost: 50,
              },
              {
                time: '15:00',
                title: 'Catedral da Sé',
                description: 'Visita à catedral',
                location: {
                  name: 'Catedral da Sé',
                  address: 'Praça da Sé, São Paulo',
                  coordinates: { lat: -23.550520, lng: -46.633308 },
                },
                category: 'atracao',
                duration: 60,
                estimatedCost: 0,
              },
            ],
          },
          {
            date: new Date(Date.now() + 172800000).toISOString(),
            dayNumber: 2,
            title: 'Dia 2 - Paulista',
            activities: [
              {
                time: '10:00',
                title: 'MASP',
                description: 'Museu de Arte de São Paulo',
                location: {
                  name: 'MASP',
                  address: 'Av. Paulista, 1578',
                  coordinates: { lat: -23.561414, lng: -46.655882 },
                },
                category: 'atracao',
                duration: 180,
                estimatedCost: 40,
              },
              {
                time: '14:00',
                title: 'Parque Trianon',
                description: 'Caminhada no parque',
                location: {
                  name: 'Parque Trianon',
                  address: 'Av. Paulista, 1578',
                  coordinates: { lat: -23.563187, lng: -46.654326 },
                },
                category: 'atracao',
                duration: 60,
                estimatedCost: 0,
              },
            ],
          },
        ],
      },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );

    // Adicionar colaborador
    await axios.post(
      `${API_URL}/api/roteiros/${itineraryId}/collaborators`,
      { email: collabEmail, permission: 'view' },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
  });

  afterAll(async () => {
    await cleanupTestData({
      emailPatterns: [/@test\.com$/i],
      titlePatterns: [/mapa/i, /teste/i],
    });
  });

  describe('GET /api/roteiros/:id/map - Mapa Completo do Roteiro', () => {
    test('✅ Deve retornar mapa completo do roteiro (owner)', async () => {
      const response = await axios.get(`${API_URL}/api/roteiros/${itineraryId}/map`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('itineraryId');
      expect(response.data).toHaveProperty('title', 'Roteiro Teste Mapa São Paulo');
      expect(response.data).toHaveProperty('center');
      expect(response.data.center).toHaveProperty('lat');
      expect(response.data.center).toHaveProperty('lng');
      expect(response.data).toHaveProperty('points');
      expect(response.data.points.length).toBe(5); // 3 dia 1 + 2 dia 2
      expect(response.data).toHaveProperty('dayRoutes');
      expect(response.data.dayRoutes.length).toBe(2); // 2 dias
      expect(response.data).toHaveProperty('statistics');
      expect(response.data.statistics).toHaveProperty('totalPoints', 5);
      expect(response.data.statistics).toHaveProperty('totalDays', 2);
      expect(response.data.statistics).toHaveProperty('totalDistance');
      expect(response.data.statistics.totalDistance).toBeGreaterThan(0);
      expect(response.data.statistics).toHaveProperty('totalTravelTime');
      expect(response.data.statistics.totalTravelTime).toBeGreaterThan(0);
    });

    test('✅ Deve retornar mapa completo (colaborador)', async () => {
      const response = await axios.get(`${API_URL}/api/roteiros/${itineraryId}/map`, {
        headers: { Authorization: `Bearer ${collabToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.points.length).toBe(5);
    });

    test('✅ Deve calcular rotas entre pontos corretamente', async () => {
      const response = await axios.get(`${API_URL}/api/roteiros/${itineraryId}/map`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      const day1Routes = response.data.dayRoutes.find(d => d.dayNumber === 1);
      expect(day1Routes).toBeDefined();
      expect(day1Routes.routes.length).toBe(2); // 3 pontos = 2 rotas
      
      // Verificar estrutura de rota
      const route = day1Routes.routes[0];
      expect(route).toHaveProperty('from');
      expect(route).toHaveProperty('to');
      expect(route).toHaveProperty('distance');
      expect(route).toHaveProperty('travelTime');
      expect(route.from).toHaveProperty('id');
      expect(route.from).toHaveProperty('title');
      expect(route.from).toHaveProperty('coordinates');
      expect(route.distance).toBeGreaterThan(0);
      expect(route.travelTime).toBeGreaterThan(0);
    });

    test('✅ Deve incluir informações corretas dos pontos', async () => {
      const response = await axios.get(`${API_URL}/api/roteiros/${itineraryId}/map`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      const firstPoint = response.data.points[0];
      expect(firstPoint).toHaveProperty('id');
      expect(firstPoint).toHaveProperty('dayNumber');
      expect(firstPoint).toHaveProperty('activityIndex');
      expect(firstPoint).toHaveProperty('time');
      expect(firstPoint).toHaveProperty('title');
      expect(firstPoint).toHaveProperty('location');
      expect(firstPoint).toHaveProperty('coordinates');
      expect(firstPoint).toHaveProperty('category');
      expect(firstPoint).toHaveProperty('estimatedCost');
      expect(firstPoint).toHaveProperty('duration');
      expect(firstPoint.coordinates).toHaveProperty('lat');
      expect(firstPoint.coordinates).toHaveProperty('lng');
    });

    test('❌ Não deve permitir acesso (usuário sem permissão)', async () => {
      try {
        await axios.get(`${API_URL}/api/roteiros/${itineraryId}/map`, {
          headers: { Authorization: `Bearer ${otherUserToken}` },
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.message).toMatch(/acesso/i);
      }
    });

    test('❌ Não deve permitir acesso sem autenticação', async () => {
      try {
        await axios.get(`${API_URL}/api/roteiros/${itineraryId}/map`);
        fail('Deveria ter lançado erro');
      } catch (error) {
        // Pode ser 401 (sem token) ou 403 (sem permissão)
        expect([401, 403]).toContain(error.response.status);
      }
    });

    test('❌ Deve retornar 404 para roteiro inexistente', async () => {
      try {
        await axios.get(`${API_URL}/api/roteiros/507f1f77bcf86cd799439011/map`, {
          headers: { Authorization: `Bearer ${ownerToken}` },
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('GET /api/roteiros/:id/map/day/:dayNumber - Mapa de Um Dia', () => {
    test('✅ Deve retornar mapa do dia 1', async () => {
      const response = await axios.get(`${API_URL}/api/roteiros/${itineraryId}/map/day/1`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('dayNumber', 1);
      expect(response.data).toHaveProperty('title', 'Dia 1 - Centro');
      expect(response.data).toHaveProperty('center');
      expect(response.data).toHaveProperty('points');
      expect(response.data.points.length).toBe(3); // 3 atividades no dia 1
      expect(response.data).toHaveProperty('routes');
      expect(response.data.routes.length).toBe(2); // 3 pontos = 2 rotas
      expect(response.data).toHaveProperty('statistics');
      expect(response.data.statistics.totalPoints).toBe(3);
    });

    test('✅ Deve retornar mapa do dia 2', async () => {
      const response = await axios.get(`${API_URL}/api/roteiros/${itineraryId}/map/day/2`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.dayNumber).toBe(2);
      expect(response.data.points.length).toBe(2);
      expect(response.data.routes.length).toBe(1);
    });

    test('✅ Deve permitir acesso ao colaborador', async () => {
      const response = await axios.get(`${API_URL}/api/roteiros/${itineraryId}/map/day/1`, {
        headers: { Authorization: `Bearer ${collabToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.points.length).toBe(3);
    });

    test('❌ Deve retornar 404 para dia inexistente', async () => {
      try {
        await axios.get(`${API_URL}/api/roteiros/${itineraryId}/map/day/99`, {
          headers: { Authorization: `Bearer ${ownerToken}` },
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.message).toMatch(/dia.*não encontrado/i);
      }
    });

    test('❌ Não deve permitir acesso (usuário sem permissão)', async () => {
      try {
        await axios.get(`${API_URL}/api/roteiros/${itineraryId}/map/day/1`, {
          headers: { Authorization: `Bearer ${otherUserToken}` },
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(403);
      }
    });
  });

  describe('GET /api/roteiros/:id/nearby - Pontos Próximos', () => {
    test('✅ Deve buscar pontos próximos (1km)', async () => {
      // Coordenadas próximas ao Mercadão (-23.541040, -46.630180)
      const response = await axios.get(
        `${API_URL}/api/roteiros/${itineraryId}/nearby?lat=-23.541&lng=-46.630&radius=1`,
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('userLocation');
      expect(response.data.userLocation).toEqual({ lat: -23.541, lng: -46.630 });
      expect(response.data).toHaveProperty('radius', 1);
      expect(response.data).toHaveProperty('points');
      expect(response.data).toHaveProperty('total');
      expect(response.data.points.length).toBeGreaterThan(0);
      
      // Verificar que os pontos estão ordenados por distância
      for (let i = 1; i < response.data.points.length; i++) {
        expect(response.data.points[i].distance).toBeGreaterThanOrEqual(
          response.data.points[i - 1].distance
        );
      }

      // Verificar estrutura do ponto
      const point = response.data.points[0];
      expect(point).toHaveProperty('id');
      expect(point).toHaveProperty('title');
      expect(point).toHaveProperty('distance');
      expect(point.distance).toBeLessThanOrEqual(1);
    });

    test('✅ Deve buscar pontos próximos (5km)', async () => {
      // Coordenadas centrais de São Paulo
      const response = await axios.get(
        `${API_URL}/api/roteiros/${itineraryId}/nearby?lat=-23.55&lng=-46.63&radius=5`,
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );

      expect(response.status).toBe(200);
      expect(response.data.radius).toBe(5);
      expect(response.data.points.length).toBeGreaterThan(0);
      
      // Todos os pontos devem estar dentro do raio
      response.data.points.forEach(point => {
        expect(point.distance).toBeLessThanOrEqual(5);
      });
    });

    test('✅ Deve usar raio padrão de 1km se não especificado', async () => {
      const response = await axios.get(
        `${API_URL}/api/roteiros/${itineraryId}/nearby?lat=-23.55&lng=-46.63`,
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );

      expect(response.status).toBe(200);
      expect(response.data.radius).toBe(1);
    });

    test('✅ Deve retornar lista vazia se não houver pontos próximos', async () => {
      // Coordenadas muito distantes (Rio de Janeiro)
      const response = await axios.get(
        `${API_URL}/api/roteiros/${itineraryId}/nearby?lat=-22.9068&lng=-43.1729&radius=1`,
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );

      expect(response.status).toBe(200);
      expect(response.data.points).toEqual([]);
      expect(response.data.total).toBe(0);
    });

    test('❌ Deve retornar 400 sem coordenadas', async () => {
      try {
        await axios.get(`${API_URL}/api/roteiros/${itineraryId}/nearby`, {
          headers: { Authorization: `Bearer ${ownerToken}` },
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toMatch(/coordenadas.*obrigatórias/i);
      }
    });

    test('❌ Não deve permitir acesso (usuário sem permissão)', async () => {
      try {
        await axios.get(
          `${API_URL}/api/roteiros/${itineraryId}/nearby?lat=-23.55&lng=-46.63`,
          { headers: { Authorization: `Bearer ${otherUserToken}` } }
        );
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(403);
      }
    });
  });

  describe('Cálculos de Distância e Tempo', () => {
    test('✅ Deve calcular distâncias realistas', async () => {
      const response = await axios.get(`${API_URL}/api/roteiros/${itineraryId}/map/day/1`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      // Rota entre Museu do Ipiranga e Mercadão (≈5-6 km)
      const route = response.data.routes[0];
      expect(route.distance).toBeGreaterThan(4);
      expect(route.distance).toBeLessThan(8);
    });

    test('✅ Deve calcular tempo de viagem proporcional à distância', async () => {
      const response = await axios.get(`${API_URL}/api/roteiros/${itineraryId}/map/day/1`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      response.data.routes.forEach(route => {
        // Tempo em minutos = distância (km) / 30 (km/h) * 60
        const expectedTime = Math.round((route.distance / 30) * 60);
        expect(route.travelTime).toBeCloseTo(expectedTime, 0);
      });
    });

    test('✅ Deve somar distâncias e tempos corretamente', async () => {
      const response = await axios.get(`${API_URL}/api/roteiros/${itineraryId}/map`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      let calculatedDistance = 0;
      let calculatedTime = 0;

      response.data.dayRoutes.forEach(day => {
        day.routes.forEach(route => {
          calculatedDistance += route.distance;
          calculatedTime += route.travelTime;
        });
      });

      expect(response.data.statistics.totalDistance).toBeCloseTo(calculatedDistance, 1);
      expect(response.data.statistics.totalTravelTime).toBe(calculatedTime);
    });
  });
});
