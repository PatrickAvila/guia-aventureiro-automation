/**
 * Testes de Explorar - API
 * 
 * Testa busca e visualização de roteiros públicos
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000';

describe('Explorar - API', () => {
  let accessToken;
  let publicItineraryId;

  beforeAll(async () => {
    // Criar usuário e fazer login
    const registerResponse = await axios.post(`${API_URL}/api/auth/signup`, {
      name: randomName(),
      email: randomEmail(),
      password: 'Senha123!@#',
      acceptedTerms: true,
    });
    
    accessToken = registerResponse.data.accessToken;

    // Tornar o perfil público
    await axios.put(
      `${API_URL}/api/auth/profile`,
      { publicProfile: true },
      { headers: { Authorization: `Bearer ${accessToken}` }}
    );

    // Criar um roteiro público para testar
    const itineraryResponse = await axios.post(
      `${API_URL}/api/roteiros`,
      {
        ...testData.validItinerary,
        isPublic: true,
      },
      { headers: { Authorization: `Bearer ${accessToken}` }}
    );
    
    publicItineraryId = itineraryResponse.data.itinerary._id;
  });

  describe('GET /api/explore/itineraries - Listar Roteiros Públicos', () => {
    test('deve listar roteiros públicos', async () => {
      const response = await axios.get(`${API_URL}/api/explore/itineraries`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('itineraries');
      expect(Array.isArray(response.data.itineraries)).toBe(true);
      expect(response.data).toHaveProperty('pagination');
    });

    test('deve permitir busca por destino', async () => {
      const response = await axios.get(
        `${API_URL}/api/explore/itineraries?search=Rio`
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('itineraries');
      expect(Array.isArray(response.data.itineraries)).toBe(true);
    });

    test('deve permitir filtro por país', async () => {
      const response = await axios.get(
        `${API_URL}/api/explore/itineraries?country=Brasil`
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('itineraries');
      expect(Array.isArray(response.data.itineraries)).toBe(true);
    });

    test('deve suportar paginação', async () => {
      const response = await axios.get(
        `${API_URL}/api/explore/itineraries?page=1&limit=5`
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('pagination');
      expect(response.data.pagination).toHaveProperty('page', 1);
      expect(response.data.pagination).toHaveProperty('limit', 5);
    });
  });

  describe('POST /api/explore/like/:id - Curtir Roteiro', () => {
    test('deve curtir roteiro público', async () => {
      const response = await axios.post(
        `${API_URL}/api/explore/like/${publicItineraryId}`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` }}
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('liked', true);
      expect(response.data).toHaveProperty('likesCount');
    });

    test('deve descurtir roteiro já curtido', async () => {
      // Já foi curtido no teste anterior, agora descurtir
      const response = await axios.post(
        `${API_URL}/api/explore/like/${publicItineraryId}`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` }}
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('liked', false);
    });
  });

  describe('POST /api/ratings - Avaliar Roteiro', () => {
    test('deve avaliar roteiro com 1-5 estrelas', async () => {
      const response = await axios.post(
        `${API_URL}/api/ratings/${publicItineraryId}`,
        {
          score: 5,
          comment: 'Roteiro excelente!',
        },
        { headers: { Authorization: `Bearer ${accessToken}` }}
      );

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('rating');
      expect(response.data.rating.score).toBe(5);
      expect(response.data.rating.comment).toBe('Roteiro excelente!');
    });

    test('deve validar número de estrelas', async () => {
      try {
        await axios.post(
          `${API_URL}/api/ratings/${publicItineraryId}`,
          { score: 6 }, // Inválido: máximo é 5
          { headers: { Authorization: `Bearer ${accessToken}` }}
        );
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    test('deve atualizar avaliação existente', async () => {
      // Primeira avaliação
      await axios.post(
        `${API_URL}/api/ratings/${publicItineraryId}`,
        { score: 3, comment: 'Regular' },
        { headers: { Authorization: `Bearer ${accessToken}` }}
      );

      // Atualizar avaliação
      const response = await axios.post(
        `${API_URL}/api/ratings/${publicItineraryId}`,
        { score: 4, comment: 'Melhor que pensei!' },
        { headers: { Authorization: `Bearer ${accessToken}` }}
      );

      expect(response.status).toBe(200); // 200 para atualização, 201 para criação
      expect(response.data.rating.score).toBe(4);
    });
  });
});
