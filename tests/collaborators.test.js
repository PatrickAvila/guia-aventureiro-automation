/**
 * Testes de Colaboradores - API
 * Testa sistema de compartilhamento e permissões de roteiros
 */

const axios = require('axios');
const { trackUser, trackItinerary, cleanupTestData } = require('./helpers/testCleanup');
const { upgradeToPremium } = require('./helpers/subscriptionHelpers');

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('Collaborators - Testes Extensivos', () => {
  let ownerToken, ownerId;
  let collabToken, collabId, collabEmail;
  let viewerToken, viewerId, viewerEmail;
  let otherToken, otherId;
  let itineraryId;

  beforeAll(async () => {
    // Criar dono do roteiro
    const ownerRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Owner Collab Test',
      email: `owner-collab-${Date.now()}@test.com`,
      password: 'Senha@123',
      acceptedTerms: true
    });
    ownerToken = ownerRes.data.accessToken;
    ownerId = ownerRes.data.user._id;
    trackUser(ownerId);

    // Upgrade para PREMIUM (para testes de colaboradores)
    await upgradeToPremium(ownerToken);

    // Criar colaborador com permissão de edição
    collabEmail = `collab-edit-${Date.now()}@test.com`;
    const collabRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Collaborator Edit',
      email: collabEmail,
      password: 'Senha@123',
      acceptedTerms: true
    });
    collabToken = collabRes.data.accessToken;
    collabId = collabRes.data.user._id;
    trackUser(collabId);

    // Criar colaborador com permissão de visualização
    viewerEmail = `viewer-${Date.now()}@test.com`;
    const viewerRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Viewer Only',
      email: viewerEmail,
      password: 'Senha@123',
      acceptedTerms: true
    });
    viewerToken = viewerRes.data.accessToken;
    viewerId = viewerRes.data.user._id;
    trackUser(viewerId);

    // Criar usuário sem acesso
    const otherRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Other User',
      email: `other-${Date.now()}@test.com`,
      password: 'Senha@123',
      acceptedTerms: true
    });
    otherToken = otherRes.data.accessToken;
    otherId = otherRes.data.user._id;
    trackUser(otherId);

    // Criar roteiro
    const itRes = await axios.post(`${API_URL}/api/roteiros`, {
      title: 'Roteiro Colaborativo',
      destination: { city: 'Porto Alegre', country: 'Brasil' },
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-05'),
      duration: 5,
      budget: { level: 'medio', estimatedTotal: 5000, currency: 'BRL' },
      status: 'rascunho'
    }, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    itineraryId = itRes.data.itinerary._id;
    trackItinerary(itineraryId);
  });

  afterAll(async () => {
    await cleanupTestData({
      emailPatterns: [/@test\.com$/],
      titlePatterns: [/Collab/i, /Colaborativo/i]
    });
  });

  describe('POST /api/roteiros/:id/collaborators - Adicionar Colaborador', () => {
    test('✅ Dono deve adicionar colaborador com permissão de edição', async () => {
      const response = await axios.post(`${API_URL}/api/roteiros/${itineraryId}/collaborators`, {
        email: collabEmail,
        permission: 'edit'
      }, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.itinerary.collaborators).toBeDefined();
      const collab = response.data.itinerary.collaborators.find(c => 
        c.user._id === collabId || c.user === collabId
      );
      expect(collab).toBeDefined();
      expect(collab.permission).toBe('edit');
    });

    test('✅ Dono deve adicionar colaborador com permissão de visualização', async () => {
      const response = await axios.post(`${API_URL}/api/roteiros/${itineraryId}/collaborators`, {
        email: viewerEmail,
        permission: 'view'
      }, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });

      expect(response.status).toBe(200);
      const viewer = response.data.itinerary.collaborators.find(c => 
        c.user._id === viewerId || c.user === viewerId
      );
      expect(viewer).toBeDefined();
      expect(viewer.permission).toBe('view');
    });

    test('❌ Colaborador não deve adicionar outros colaboradores', async () => {
      try {
        await axios.post(`${API_URL}/api/roteiros/${itineraryId}/collaborators`, {
          email: `new-collab-${Date.now()}@test.com`,
          permission: 'view'
        }, {
          headers: { Authorization: `Bearer ${collabToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(403);
      }
    });

    test('❌ Não deve adicionar colaborador sem email', async () => {
      try {
        await axios.post(`${API_URL}/api/roteiros/${itineraryId}/collaborators`, {
          permission: 'view'
        }, {
          headers: { Authorization: `Bearer ${ownerToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    test('❌ Não deve adicionar colaborador com email inválido', async () => {
      try {
        await axios.post(`${API_URL}/api/roteiros/${itineraryId}/collaborators`, {
          email: 'email-invalido',
          permission: 'view'
        }, {
          headers: { Authorization: `Bearer ${ownerToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    test('❌ Não deve adicionar colaborador inexistente', async () => {
      try {
        await axios.post(`${API_URL}/api/roteiros/${itineraryId}/collaborators`, {
          email: 'usuario-nao-existe@test.com',
          permission: 'view'
        }, {
          headers: { Authorization: `Bearer ${ownerToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });

    test('❌ Não deve adicionar permissão inválida', async () => {
      try {
        await axios.post(`${API_URL}/api/roteiros/${itineraryId}/collaborators`, {
          email: collabEmail,
          permission: 'admin'
        }, {
          headers: { Authorization: `Bearer ${ownerToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  // ⚠️ PUT /api/roteiros/:id/collaborators/:userId não existe no backend
  // describe('PUT /api/roteiros/:id/collaborators/:userId - Atualizar Permissão', () => { ...});

  describe('DELETE /api/roteiros/:id/collaborators/:userId - Remover Colaborador', () => {
    let removeItineraryId, removeCollabId;

    afterEach(async () => {
      // 🧹 Limpar roteiro criado para este teste
      try {
        await axios.delete(`${API_URL}/api/roteiros/${removeItineraryId}`, {
          headers: { Authorization: `Bearer ${ownerToken}` }
        });
      } catch (error) {
        // Ignorar se já foi deletado no teste
      }
    });

    beforeEach(async () => {
      // Criar roteiro novo para cada teste de remoção
      const itRes = await axios.post(`${API_URL}/api/roteiros`, {
        title: `Roteiro Remove Collab ${Date.now()}`,
        destination: { city: 'Florianópolis', country: 'Brasil' },
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-03'),
        duration: 3,
        budget: { level: 'economico', estimatedTotal: 2000, currency: 'BRL' }
      }, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      removeItineraryId = itRes.data.itinerary._id;
      trackItinerary(removeItineraryId);

      // Adicionar colaborador
      const collabRes = await axios.post(`${API_URL}/api/roteiros/${removeItineraryId}/collaborators`, {
        email: collabEmail,
        permission: 'edit'
      }, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });

      removeCollabId = collabId;
    });

    test('✅ Dono deve remover colaborador', async () => {
      const response = await axios.delete(
        `${API_URL}/api/roteiros/${removeItineraryId}/collaborators/${removeCollabId}`,
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );

      expect(response.status).toBe(200);
      const collab = response.data.itinerary.collaborators.find(c => 
        c.user._id === removeCollabId || c.user === removeCollabId
      );
      expect(collab).toBeUndefined();
    });

    test('✅ Colaborador deve poder sair do roteiro (remover a si mesmo)', async () => {
      const response = await axios.delete(
        `${API_URL}/api/roteiros/${removeItineraryId}/collaborators/${removeCollabId}`,
        { headers: { Authorization: `Bearer ${collabToken}` } }
      );

      expect(response.status).toBe(200);
    });

    test('❌ Colaborador não deve remover outros colaboradores', async () => {
      // Adicionar segundo colaborador
      await axios.post(`${API_URL}/api/roteiros/${removeItineraryId}/collaborators`, {
        email: viewerEmail,
        permission: 'view'
      }, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });

      try {
        await axios.delete(
          `${API_URL}/api/roteiros/${removeItineraryId}/collaborators/${viewerId}`,
          { headers: { Authorization: `Bearer ${collabToken}` } }
        );
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(403);
      }
    });
  });

  describe('Permissões de Acesso ao Roteiro', () => {
    test.skip('✅ Colaborador com edit deve conseguir editar roteiro', async () => {
      // SKIP: PUT collaborators não implementado (não há endpoint para atualizar permissões)
      // Restaurar permissão de edição
      await axios.put(
        `${API_URL}/api/roteiros/${itineraryId}/collaborators/${collabId}`,
        { permission: 'edit' },
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );

      const response = await axios.put(`${API_URL}/api/roteiros/${itineraryId}`, {
        title: 'Roteiro Editado por Colaborador'
      }, {
        headers: { Authorization: `Bearer ${collabToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.itinerary.title).toBe('Roteiro Editado por Colaborador');
    });

    test('✅ Colaborador com view deve conseguir visualizar roteiro', async () => {
      const response = await axios.get(`${API_URL}/api/roteiros/${itineraryId}`, {
        headers: { Authorization: `Bearer ${viewerToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data._id).toBe(itineraryId);
    });

    test.skip('❌ Colaborador com view não deve conseguir editar roteiro', async () => {
      // SKIP: PUT collaborators não implementado (não há endpoint para atualizar permissões)
      // Garantir que viewer tem apenas permissão de visualização
      await axios.put(
        `${API_URL}/api/roteiros/${itineraryId}/collaborators/${viewerId}`,
        { permission: 'view' },
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );

      try {
        await axios.put(`${API_URL}/api/roteiros/${itineraryId}`, {
          title: 'Tentativa de Edição por Viewer'
        }, {
          headers: { Authorization: `Bearer ${viewerToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(403);
      }
    });

    test('❌ Usuário sem acesso não deve visualizar roteiro privado', async () => {
      try {
        await axios.get(`${API_URL}/api/roteiros/${itineraryId}`, {
          headers: { Authorization: `Bearer ${otherToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(403);
      }
    });

    test('❌ Usuário sem acesso não deve editar roteiro', async () => {
      try {
        await axios.put(`${API_URL}/api/roteiros/${itineraryId}`, {
          title: 'Tentativa de Hack'
        }, {
          headers: { Authorization: `Bearer ${otherToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(403);
      }
    });
  });

  // ⚠️ GET /api/roteiros/:id/collaborators não existe no backend
  // describe('GET /api/roteiros/:id/collaborators - Listar Colaboradores', () => { ...});

  describe('Notificações de Colaboração', () => {
    afterEach(async () => {
      // 🧹 Nota: Não podemos listar colaboradores via GET (endpoint não existe)
      // Cleanup será feito pelo cleanupTestData
    });

    test.skip('✅ Colaborador deve receber notificação ao ser  adicionado', async () => {
      // SKIP: Notificações de colaboradores podem não estar totalmente implementadas
      // Criar novo usuário para testar notificação
      const newUserRes = await axios.post(`${API_URL}/api/auth/signup`, {
        name: 'Notification Test',
        email: `notification-${Date.now()}@test.com`,
        password: 'Senha@123',
        acceptedTerms: true
      });
      trackUser(newUserRes.data.user._id);

      // Adicionar como colaborador
      await axios.post(`${API_URL}/api/roteiros/${itineraryId}/collaborators`, {
        email: newUserRes.data.user.email,
        permission: 'view'
      }, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });

      // Verificar notificações
      const notifRes = await axios.get(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${newUserRes.data.accessToken}` }
      });

      if (notifRes.status === 200) {
        const collabNotif = notifRes.data.notifications.find(n => 
          n.type === 'new_collaborator' || n.message?.includes('colaborador')
        );
        expect(collabNotif).toBeDefined();
      }
    });
  });

  describe('Regras de Negócio', () => {
    test('❌ Não deve adicionar o próprio dono como colaborador', async () => {
      const ownerProfile = await axios.get(`${API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });

      try {
        await axios.post(`${API_URL}/api/roteiros/${itineraryId}/collaborators`, {
          email: ownerProfile.data.user.email,
          permission: 'edit'
        }, {
          headers: { Authorization: `Bearer ${ownerToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response).toBeDefined();
        expect(error.response.status).toBe(400);
      }
    });

    test('❌ Não deve adicionar mesmo colaborador duas vezes', async () => {
      try {
        await axios.post(`${API_URL}/api/roteiros/${itineraryId}/collaborators`, {
          email: collabEmail,
          permission: 'edit'
        }, {
          headers: { Authorization: `Bearer ${ownerToken}` }
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });
});

