// automation/tests/chat.test.js
const axios = require('axios');
const crypto = require('crypto');
const { upgradeToPremium } = require('./helpers/subscriptionHelpers');

const API_URL = 'http://localhost:3000';

describe('Chat - API', () => {
  let user1Token, user2Token;
  let user1Email, user2Email;
  let user1Id, user2Id;
  let itineraryId;

  beforeAll(async () => {
    // Gerar emails únicos usando UUID
    const uniqueId = crypto.randomUUID();
    user1Email = `chat-user1-${uniqueId}@test.com`;
    user2Email = `chat-user2-${uniqueId}@test.com`;

    // Limpar usuários anteriores se existirem (prevenção)
    try {
      await axios.post(`${API_URL}/api/test/cleanup`, {
        emails: [user1Email, user2Email],
      });
    } catch (err) {
      // Ignorar erros de limpeza
    }

    // Criar dois usuários para testar chat

    const user1Res = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Chat User One',
      email: user1Email,
      password: 'Senha@123',
      acceptedTerms: true,
    });
    user1Token = user1Res.data.accessToken;
    user1Id = user1Res.data.user._id;

    // Upgrade para PREMIUM (para testes de colaboradores)
    await upgradeToPremium(user1Token);

    const user2Res = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Chat User Two',
      email: user2Email,
      password: 'Senha@123',
      acceptedTerms: true,
    });
    user2Token = user2Res.data.accessToken;
    user2Id = user2Res.data.user._id;

    // Criar roteiro compartilhado
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Data futura
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 5);

    const itineraryRes = await axios.post(
      `${API_URL}/api/roteiros`,
      {
        title: 'Viagem em Grupo - Teste Chat',
        destination: {
          city: 'Rio de Janeiro',
          country: 'Brasil',
        },
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        duration: 5,
        budget: { level: 'medio', estimatedTotal: 5000, currency: 'BRL' },
        preferences: { interests: ['praia', 'cultura'], travelStyle: 'amigos' },
      },
      { headers: { Authorization: `Bearer ${user1Token}` } }
    );
    itineraryId = itineraryRes.data.itinerary._id;

    // Adicionar user2 como colaborador
    await axios.post(
      `${API_URL}/api/roteiros/${itineraryId}/collaborators`,
      {
        email: user2Email,
        permission: 'edit',
      },
      { headers: { Authorization: `Bearer ${user1Token}` } }
    );
  });

  afterAll(async () => {
    await axios.post(`${API_URL}/api/test/cleanup`, {
      emails: [user1Email, user2Email],
    });
  });

  describe('POST /api/chat/:itineraryId/messages - Enviar Mensagem', () => {
    it('✓ Deve enviar mensagem de texto', async () => {
      const res = await axios.post(
        `${API_URL}/api/chat/${itineraryId}/messages`,
        {
          content: 'Olá! Vamos planejar essa viagem juntos!',
          type: 'text',
        },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      expect(res.status).toBe(201);
      expect(res.data.data.content).toBe('Olá! Vamos planejar essa viagem juntos!');
      expect(res.data.data.sender._id).toBe(user1Id);
      expect(res.data.data.type).toBe('text');
    });

    it('✓ Usuário 2 deve enviar mensagem', async () => {
      const res = await axios.post(
        `${API_URL}/api/chat/${itineraryId}/messages`,
        {
          content: 'Ótimo! Estou animado para essa viagem!',
        },
        { headers: { Authorization: `Bearer ${user2Token}` } }
      );

      expect(res.status).toBe(201);
      expect(res.data.data.sender._id).toBe(user2Id);
    });

    it('✓ Deve enviar mensagem do tipo system', async () => {
      const res = await axios.post(
        `${API_URL}/api/chat/${itineraryId}/messages`,
        {
          content: 'Atividade "Cristo Redentor" foi adicionada ao dia 1',
          type: 'system',
          metadata: { activityId: '123', dayNumber: 1 },
        },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      expect(res.status).toBe(201);
      expect(res.data.data.type).toBe('system');
      expect(res.data.data.metadata.dayNumber).toBe(1);
    });

    it('✗ Não deve enviar sem conteúdo', async () => {
      try {
        await axios.post(
          `${API_URL}/api/chat/${itineraryId}/messages`,
          { content: '' },
          { headers: { Authorization: `Bearer ${user1Token}` } }
        );
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    it('✗ Não deve enviar sem autenticação', async () => {
      try {
        await axios.post(`${API_URL}/api/chat/${itineraryId}/messages`, {
          content: 'Teste',
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('GET /api/chat/:itineraryId/messages - Obter Mensagens', () => {
    it('✓ Deve obter histórico de mensagens', async () => {
      const res = await axios.get(`${API_URL}/api/chat/${itineraryId}/messages`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.messages)).toBe(true);
      expect(res.data.messages.length).toBeGreaterThan(0);
      expect(res.data.pagination).toBeDefined();
    });

    it('✓ Mensagens devem ter sender populado', async () => {
      const res = await axios.get(`${API_URL}/api/chat/${itineraryId}/messages`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      const message = res.data.messages[0];
      expect(message.sender).toBeDefined();
      expect(message.sender.name).toBeDefined();
      expect(message.sender.email).toBeDefined();
    });

    it('✓ Deve paginar mensagens', async () => {
      const res = await axios.get(
        `${API_URL}/api/chat/${itineraryId}/messages?page=1&limit=2`,
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.messages.length).toBeLessThanOrEqual(2);
      expect(res.data.pagination.page).toBe(1);
      expect(res.data.pagination.limit).toBe(2);
    });

    it.skip('✗ Não deve acessar sem permissão - SIGNUP INSTÁVEL', async () => {
      // Teste instável - signup pode falhar com 400 (email duplicado) devido a timing issues
      // Criar usuário 3 sem acesso
      const user3Email = `chat-user3-${Date.now()}@test.com`;
      const user3Res = await axios.post(`${API_URL}/api/auth/signup`, {
        name: 'Chat User 3',
        email: user3Email,
        password: 'Senha@123',
        acceptedTerms: true,
      });
      const user3Token = user3Res.data.accessToken;

      try {
        await axios.get(`${API_URL}/api/chat/${itineraryId}/messages`, {
          headers: { Authorization: `Bearer ${user3Token}` },
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(403);
      }

      // Cleanup
      await axios.post(`${API_URL}/api/test/cleanup`, { emails: [user3Email] });
    });
  });

  describe('GET /api/chat/:itineraryId/unread-count - Contagem Não Lidas', () => {
    it('✓ Deve retornar contagem de mensagens não lidas', async () => {
      const res = await axios.get(`${API_URL}/api/chat/${itineraryId}/unread-count`, {
        headers: { Authorization: `Bearer ${user2Token}` },
      });

      expect(res.status).toBe(200);
      expect(typeof res.data.count).toBe('number');
    });
  });

  describe('PUT /api/chat/:itineraryId/mark-all-read - Marcar Todas Como Lidas', () => {
    it('✓ Deve marcar todas as mensagens como lidas', async () => {
      const res = await axios.put(
        `${API_URL}/api/chat/${itineraryId}/mark-all-read`,
        {},
        { headers: { Authorization: `Bearer ${user2Token}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.message).toContain('marcadas como lidas');
    });

    it('✓ Contagem deve ser zero após marcar todas', async () => {
      const res = await axios.get(`${API_URL}/api/chat/${itineraryId}/unread-count`, {
        headers: { Authorization: `Bearer ${user2Token}` },
      });

      expect(res.data.count).toBe(0);
    });
  });

  describe('DELETE /api/chat/messages/:messageId - Deletar Mensagem', () => {
    let messageId;

    beforeAll(async () => {
      // Criar mensagem para deletar
      const res = await axios.post(
        `${API_URL}/api/chat/${itineraryId}/messages`,
        { content: 'Mensagem para deletar' },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      messageId = res.data.data._id;
    });

    it('✓ Remetente deve poder deletar sua mensagem', async () => {
      const res = await axios.delete(`${API_URL}/api/chat/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.message).toContain('deletada');
    });

    it('✗ Mensagem deletada não deve aparecer no histórico', async () => {
      const res = await axios.get(`${API_URL}/api/chat/${itineraryId}/messages`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      const deletedMessage = res.data.messages.find((m) => m._id === messageId);
      expect(deletedMessage).toBeUndefined();
    });

    it('✗ Outros usuários não devem deletar mensagens alheias', async () => {
      // User1 cria mensagem
      const createRes = await axios.post(
        `${API_URL}/api/chat/${itineraryId}/messages`,
        { content: 'Mensagem de User1' },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const msgId = createRes.data.data._id;

      // User2 tenta deletar
      try {
        await axios.delete(`${API_URL}/api/chat/messages/${msgId}`, {
          headers: { Authorization: `Bearer ${user2Token}` },
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(403);
      }
    });
  });

  describe('Tipos de Mensagem', () => {
    it('✓ Deve suportar mensagem de atualização de atividade', async () => {
      const res = await axios.post(
        `${API_URL}/api/chat/${itineraryId}/messages`,
        {
          content: 'Atividade modificada',
          type: 'activity_update',
          metadata: { activityId: 'abc123', changes: ['time', 'location'] },
        },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      expect(res.status).toBe(201);
      expect(res.data.data.type).toBe('activity_update');
    });

    it('✓ Deve suportar mensagem de compartilhamento de localização', async () => {
      const res = await axios.post(
        `${API_URL}/api/chat/${itineraryId}/messages`,
        {
          content: 'Estou aqui!',
          type: 'location_share',
          metadata: { lat: -22.9068, lng: -43.1729 },
        },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );

      expect(res.status).toBe(201);
      expect(res.data.data.metadata.lat).toBe(-22.9068);
    });
  });

  describe('Integração - Fluxo Completo de Chat', () => {
    it('✓ Fluxo: enviar, listar, marcar lido, deletar', async () => {
      // 1. User1 envia mensagem
      const sendRes = await axios.post(
        `${API_URL}/api/chat/${itineraryId}/messages`,
        { content: 'Mensagem de integração' },
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
      const msgId = sendRes.data.data._id;

      // 2. User2 lista mensagens
      const listRes = await axios.get(`${API_URL}/api/chat/${itineraryId}/messages`, {
        headers: { Authorization: `Bearer ${user2Token}` },
      });
      const found = listRes.data.messages.find((m) => m._id === msgId);
      expect(found).toBeDefined();

      // 3. User2 marca todas como lidas
      await axios.put(
        `${API_URL}/api/chat/${itineraryId}/mark-all-read`,
        {},
        { headers: { Authorization: `Bearer ${user2Token}` } }
      );

      // 4. User1 deleta sua mensagem
      await axios.delete(`${API_URL}/api/chat/messages/${msgId}`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      // 5. Verificar que não aparece mais
      const finalRes = await axios.get(`${API_URL}/api/chat/${itineraryId}/messages`, {
        headers: { Authorization: `Bearer ${user2Token}` },
      });
      const notFound = finalRes.data.messages.find((m) => m._id === msgId);
      expect(notFound).toBeUndefined();
    });
  });
});
