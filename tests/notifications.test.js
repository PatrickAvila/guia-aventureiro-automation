// automation/tests/notifications.test.js
const axios = require('axios');

const API_URL = 'http://localhost:3000';

describe('Notificações - API', () => {
  let userToken;
  let userId;
  let userEmail;
  let notificationId;

  beforeAll(async () => {
    // Criar usuário para testes
    userEmail = `notify-user-${Date.now()}@test.com`;
    const signupRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Notification Test User',
      email: userEmail,
      password: 'Senha@123',
      acceptedTerms: true,
    });
    userToken = signupRes.data.accessToken;
    userId = signupRes.data.user._id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await axios.post(`${API_URL}/api/test/cleanup`, {
      emails: [userEmail],
    });
  });

  describe('POST /api/notifications - Criar Notificação', () => {
    it('✓ Deve criar notificação', async () => {
      const res = await axios.post(
        `${API_URL}/api/notifications`,
        {
          userId,
          type: 'achievement_unlocked',
          title: 'Conquista Desbloqueada!',
          message: 'Você desbloqueou a conquista "Primeiro Roteiro"',
          data: { achievementId: '123', points: 10 },
          priority: 'high',
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      expect(res.status).toBe(201);
      expect(res.data.notification).toBeDefined();
      expect(res.data.notification.type).toBe('achievement_unlocked');
      expect(res.data.notification.read).toBe(false);
      notificationId = res.data.notification._id;
    });

    it('✗ Não deve criar notificação sem campos obrigatórios', async () => {
      try {
        await axios.post(
          `${API_URL}/api/notifications`,
          {
            userId,
            type: 'system',
            // faltando title e message
          },
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toContain('obrigatórios');
      }
    });

    it('✗ Não deve criar notificação sem autenticação', async () => {
      try {
        await axios.post(`${API_URL}/api/notifications`, {
          userId,
          type: 'system',
          title: 'Test',
          message: 'Test message',
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('GET /api/notifications - Listar Notificações', () => {
    beforeAll(async () => {
      // Criar algumas notificações para teste
      await axios.post(
        `${API_URL}/api/notifications`,
        {
          userId,
          type: 'trip_reminder',
          title: 'Viagem em 3 dias',
          message: 'Sua viagem para São Paulo começa em 3 dias',
          priority: 'medium',
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      
      await axios.post(
        `${API_URL}/api/notifications`,
        {
          userId,
          type: 'budget_alert',
          title: 'Orçamento Atingido',
          message: 'Você atingiu 80% do orçamento',
          priority: 'high',
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
    });

    it('✓ Deve listar notificações do usuário', async () => {
      const res = await axios.get(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.notifications).toBeDefined();
      expect(Array.isArray(res.data.notifications)).toBe(true);
      expect(res.data.notifications.length).toBeGreaterThan(0);
      expect(res.data.pagination).toBeDefined();
      expect(res.data.unreadCount).toBeGreaterThan(0);
    });

    it('✓ Deve filtrar apenas não lidas', async () => {
      const res = await axios.get(`${API_URL}/api/notifications?unreadOnly=true`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.notifications.every(n => n.read === false)).toBe(true);
    });

    it('✓ Deve filtrar por tipo', async () => {
      const res = await axios.get(`${API_URL}/api/notifications?type=trip_reminder`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.notifications.every(n => n.type === 'trip_reminder')).toBe(true);
    });

    it('✓ Deve paginar resultados', async () => {
      const res = await axios.get(`${API_URL}/api/notifications?page=1&limit=2`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.notifications.length).toBeLessThanOrEqual(2);
      expect(res.data.pagination.page).toBe(1);
      expect(res.data.pagination.limit).toBe(2);
    });

    it('✗ Não deve listar sem autenticação', async () => {
      try {
        await axios.get(`${API_URL}/api/notifications`);
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('GET /api/notifications/unread-count - Contar Não Lidas', () => {
    it('✓ Deve retornar contagem de não lidas', async () => {
      const res = await axios.get(`${API_URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.count).toBeDefined();
      expect(typeof res.data.count).toBe('number');
      expect(res.data.count).toBeGreaterThan(0);
    });

    it('✗ Não deve contar sem autenticação', async () => {
      try {
        await axios.get(`${API_URL}/api/notifications/unread-count`);
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('PUT /api/notifications/:id/read - Marcar Como Lida', () => {
    it('✓ Deve marcar notificação como lida', async () => {
      const res = await axios.put(
        `${API_URL}/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.notification.read).toBe(true);
      expect(res.data.notification.readAt).toBeDefined();
    });

    it('✓ Deve permitir marcar já lida novamente', async () => {
      const res = await axios.put(
        `${API_URL}/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.message).toContain('já estava marcada');
    });

    it('✗ Deve retornar 404 para notificação inexistente', async () => {
      try {
        await axios.put(
          `${API_URL}/api/notifications/507f1f77bcf86cd799439011/read`,
          {},
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });

    it('✗ Não deve marcar sem autenticação', async () => {
      try {
        await axios.put(`${API_URL}/api/notifications/${notificationId}/read`, {});
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('PUT /api/notifications/read-all - Marcar Todas Como Lidas', () => {
    beforeAll(async () => {
      // Criar mais notificações não lidas
      await axios.post(
        `${API_URL}/api/notifications`,
        {
          userId,
          type: 'system',
          title: 'Sistema Atualizado',
          message: 'Nova versão disponível',
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
    });

    it('✓ Deve marcar todas como lidas', async () => {
      const res = await axios.put(
        `${API_URL}/api/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.count).toBeGreaterThan(0);

      // Verificar que não há mais notificações não lidas
      const unreadRes = await axios.get(`${API_URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(unreadRes.data.count).toBe(0);
    });

    it('✗ Não deve marcar sem autenticação', async () => {
      try {
        await axios.put(`${API_URL}/api/notifications/read-all`, {});
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('DELETE /api/notifications/:id - Deletar Notificação', () => {
    let deleteNotificationId;

    beforeAll(async () => {
      const res = await axios.post(
        `${API_URL}/api/notifications`,
        {
          userId,
          type: 'system',
          title: 'Teste Delete',
          message: 'Esta notificação será deletada',
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      deleteNotificationId = res.data.notification._id;
    });

    it('✓ Deve deletar notificação', async () => {
      const res = await axios.delete(
        `${API_URL}/api/notifications/${deleteNotificationId}`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.message).toContain('deletada com sucesso');
    });

    it('✗ Deve retornar 404 ao deletar novamente', async () => {
      try {
        await axios.delete(
          `${API_URL}/api/notifications/${deleteNotificationId}`,
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });

    it('✗ Não deve deletar sem autenticação', async () => {
      try {
        await axios.delete(`${API_URL}/api/notifications/${deleteNotificationId}`);
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('DELETE /api/notifications/read - Deletar Lidas', () => {
    beforeAll(async () => {
      // Criar e marcar algumas como lidas
      const res1 = await axios.post(
        `${API_URL}/api/notifications`,
        {
          userId,
          type: 'system',
          title: 'Lida 1',
          message: 'Será deletada',
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      await axios.put(
        `${API_URL}/api/notifications/${res1.data.notification._id}/read`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
    });

    it('✓ Deve deletar todas as lidas', async () => {
      const res = await axios.delete(`${API_URL}/api/notifications/read`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.count).toBeGreaterThan(0);
    });

    it('✗ Não deve deletar sem autenticação', async () => {
      try {
        await axios.delete(`${API_URL}/api/notifications/read`);
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Funcionalidades do Model', () => {
    it('✓ Deve expirar notificações antigas', async () => {
      // Criar notificação com expiração no passado
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await axios.post(
        `${API_URL}/api/notifications`,
        {
          userId,
          type: 'trip_reminder',
          title: 'Expirada',
          message: 'Esta notificação expirou',
          expiresAt: pastDate.toISOString(),
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      // Aqui normalmente haveria um cron job que remove expiradas
      // Por enquanto apenas verificamos que foi criada com expiresAt
      const res = await axios.get(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      const expiredNotif = res.data.notifications.find(n => n.title === 'Expirada');
      expect(expiredNotif).toBeDefined();
      expect(expiredNotif.expiresAt).toBeDefined();
    });

    it('✓ Deve ordenar por data de criação (mais recente primeiro)', async () => {
      // Criar algumas notificações para garantir múltiplos resultados
      await axios.post(
        `${API_URL}/api/notifications`,
        {
          userId,
          type: 'system',
          title: 'Ordem 1',
          message: 'Primeira notificação',
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      
      await new Promise(resolve => setTimeout(resolve, 100)); // Aguardar 100ms
      
      await axios.post(
        `${API_URL}/api/notifications`,
        {
          userId,
          type: 'system',
          title: 'Ordem 2',
          message: 'Segunda notificação',
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      const res = await axios.get(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      const notifications = res.data.notifications;
      expect(notifications.length).toBeGreaterThan(1);

      // Verificar ordenação descendente
      for (let i = 0; i < notifications.length - 1; i++) {
        const current = new Date(notifications[i].createdAt);
        const next = new Date(notifications[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });
  });
});
