/**
 * Testes de Roteiros - API
 * 
 * Testa CRUD de roteiros e geração com IA
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000';

describe('Roteiros - API', () => {
  let accessToken;
  let userId;
  let testItineraryId;

  beforeAll(async () => {
    // Criar usuário e fazer login para ter token
    const userEmail = randomEmail();
    const registerResponse = await axios.post(`${API_URL}/api/auth/signup`, {
      name: randomName(),
      email: userEmail,
      password: 'Senha123!@#',
      acceptedTerms: true,
    });
    
    accessToken = registerResponse.data.accessToken;
    userId = registerResponse.data.user._id;
  });

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  describe('POST /api/roteiros - Criar Roteiro', () => {
    test('deve criar roteiro com dados válidos', async () => {
      const response = await axios.post(
        `${API_URL}/api/roteiros`,
        testData.validItinerary,
        authHeaders()
      );

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('itinerary');
      expect(response.data.itinerary).toHaveProperty('_id');
      expect(response.data.itinerary.destination.city).toBe(testData.validItinerary.destination.city);
      expect(response.data.itinerary.owner).toBeDefined();
      
      testItineraryId = response.data.itinerary._id;
    });

    test('deve validar campos obrigatórios', async () => {
      try {
        await axios.post(
          `${API_URL}/api/roteiros`,
          { destination: 'Rio' }, // Faltando outros campos
          authHeaders()
        );
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    test('deve rejeitar datas inválidas', async () => {
      const response = await axios.post(
        `${API_URL}/api/roteiros`,
        {
          ...testData.validItinerary,
          endDate: testData.validItinerary.startDate, // Data inválida
        },
        { ...authHeaders(), validateStatus: () => true }
      );
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/roteiros - Listar Roteiros', () => {
    test('deve listar roteiros do usuário', async () => {
      const response = await axios.get(
        `${API_URL}/api/roteiros`,
        authHeaders()
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('itineraries');
      expect(Array.isArray(response.data.itineraries)).toBe(true);
      expect(response.data.itineraries.length).toBeGreaterThan(0);
      expect(response.data.itineraries[0]).toHaveProperty('_id');
      expect(response.data.itineraries[0]).toHaveProperty('destination');
    });

    test('deve rejeitar acesso sem autenticação', async () => {
      try {
        await axios.get(`${API_URL}/api/roteiros`);
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('GET /api/roteiros/:id - Buscar Roteiro', () => {
    test('deve buscar roteiro por ID', async () => {
      const response = await axios.get(
        `${API_URL}/api/roteiros/${testItineraryId}`,
        authHeaders()
      );

      expect(response.status).toBe(200);
      expect(response.data._id).toBe(testItineraryId);
      expect(response.data.destination.city).toBe(testData.validItinerary.destination.city);
      expect(response.data.destination.country).toBe(testData.validItinerary.destination.country);
    });

    test('deve retornar 404 para ID inexistente', async () => {
      try {
        await axios.get(
          `${API_URL}/api/roteiros/000000000000000000000000`,
          authHeaders()
        );
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('PUT /api/roteiros/:id - Atualizar Roteiro', () => {
    test('deve atualizar roteiro', async () => {
      const response = await axios.put(
        `${API_URL}/api/roteiros/${testItineraryId}`,
        {
          title: 'Viagem Atualizada',
          budget: {
            level: 'luxo',
            estimatedTotal: 3000,
          },
        },
        authHeaders()
      );

      expect(response.status).toBe(200);
      expect(response.data.itinerary.title).toBe('Viagem Atualizada');
      expect(response.data.itinerary.budget.level).toBe('luxo');
    });

    test('deve rejeitar atualização de roteiro de outro usuário', async () => {
      // Criar outro usuário
      const otherUserResponse = await axios.post(`${API_URL}/api/auth/signup`, {
        name: randomName(),
        email: randomEmail(),
        password: 'Senha123!@#',
        acceptedTerms: true,
      });

      try {
        await axios.put(
          `${API_URL}/api/roteiros/${testItineraryId}`,
          { destination: 'Hacked' },
          { headers: { Authorization: `Bearer ${otherUserResponse.data.accessToken}` }}
        );
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(403);
      }
    });
  });

  describe('DELETE /api/roteiros/:id - Deletar Roteiro', () => {
    test('deve deletar roteiro', async () => {
      const response = await axios.delete(
        `${API_URL}/api/roteiros/${testItineraryId}`,
        authHeaders()
      );

      expect(response.status).toBe(200);
      expect(response.data.message).toContain('excluído');

      // Verificar que foi deletado
      try {
        await axios.get(
          `${API_URL}/api/roteiros/${testItineraryId}`,
          authHeaders()
        );
        fail('Roteiro ainda existe');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });
});
