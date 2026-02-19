// automation/tests/social.test.js
const axios = require('axios');
const { upgradeToPremium } = require('./helpers/subscriptionHelpers');

const API_URL = 'http://localhost:3000';

describe('Compartilhamento Social - API', () => {
  let ownerToken;
  let ownerEmail;
  let ownerId;
  let itineraryId;
  let shareLink;

  beforeAll(async () => {
    // Criar usuário proprietário
    ownerEmail = `social-owner-${Date.now()}@test.com`;
    const signupRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Social Share Owner',
      email: ownerEmail,
      password: 'Senha@123',
      acceptedTerms: true,
    });
    ownerToken = signupRes.data.accessToken;
    ownerId = signupRes.data.user._id;

    // Upgrade para PREMIUM (para compartilhamento)
    await upgradeToPremium(ownerToken);

    // Criar roteiro
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3);

    const itineraryRes = await axios.post(
      `${API_URL}/api/roteiros`,
      {
        title: 'Roteiro Social Test',
        destination: {
          city: 'São Paulo',
          country: 'Brasil',
          coverImage: 'https://example.com/sp.jpg',
        },
        startDate,
        endDate,
        duration: 3,
      },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    itineraryId = itineraryRes.data.itinerary._id;

    // Adicionar dias/atividades ao roteiro
    await axios.put(
      `${API_URL}/api/roteiros/${itineraryId}`,
      {
        days: [
          {
            dayNumber: 1,
            date: new Date(),
            title: 'Dia 1',
            activities: [
              {
                time: '09:00',
                title: 'Atividade 1',
                description: 'Teste',
                location: {
                  name: 'Local 1',
                  coordinates: { lat: -23.5505, lng: -46.6333 },
                },
                category: 'atracao',
                duration: 60,
              },
            ],
          },
        ],
      },
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );

    // Gerar link de compartilhamento
    const shareRes = await axios.post(
      `${API_URL}/api/roteiros/${itineraryId}/share`,
      {},
      { headers: { Authorization: `Bearer ${ownerToken}` } }
    );
    shareLink = shareRes.data.shareLink;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await axios.post(`${API_URL}/api/test/cleanup`, {
      emails: [ownerEmail],
    });
  });

  describe('GET /api/social/share-stats/:id - Estatísticas', () => {
    it('✓ Deve retornar estatísticas de compartilhamento', async () => {
      const res = await axios.get(`${API_URL}/api/social/share-stats/${itineraryId}`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.itineraryId).toBe(itineraryId);
      expect(res.data.stats).toBeDefined();
      expect(res.data.stats.views).toBeDefined();
      expect(res.data.stats.likes).toBeDefined();
      expect(res.data.stats.shares).toBeDefined();
      expect(res.data.stats.copies).toBeDefined();
    });

    it('✗ Não deve retornar stats sem autenticação', async () => {
      try {
        await axios.get(`${API_URL}/api/social/share-stats/${itineraryId}`);
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });

    it('✗ Deve retornar 404 para roteiro inexistente', async () => {
      try {
        await axios.get(`${API_URL}/api/social/share-stats/507f1f77bcf86cd799439011`, {
          headers: { Authorization: `Bearer ${ownerToken}` },
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('POST /api/social/track-share/:id - Registrar Compartilhamento', () => {
    it('✓ Deve registrar compartilhamento no Facebook', async () => {
      const res = await axios.post(
        `${API_URL}/api/social/track-share/${itineraryId}`,
        { platform: 'facebook' },
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.shareCount).toBeGreaterThan(0);
    });

    it('✓ Deve registrar compartilhamento no WhatsApp', async () => {
      const res = await axios.post(
        `${API_URL}/api/social/track-share/${itineraryId}`,
        { platform: 'whatsapp' },
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.shareCount).toBeGreaterThan(0);
    });

    it('✓ Deve incrementar contador a cada compartilhamento', async () => {
      const res1 = await axios.post(
        `${API_URL}/api/social/track-share/${itineraryId}`,
        { platform: 'twitter' },
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );
      const count1 = res1.data.shareCount;

      const res2 = await axios.post(
        `${API_URL}/api/social/track-share/${itineraryId}`,
        { platform: 'instagram' },
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );
      const count2 = res2.data.shareCount;

      expect(count2).toBe(count1 + 1);
    });

    it('✗ Não deve registrar sem platform', async () => {
      try {
        await axios.post(
          `${API_URL}/api/social/track-share/${itineraryId}`,
          {},
          { headers: { Authorization: `Bearer ${ownerToken}` } }
        );
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    it('✗ Não deve registrar sem autenticação', async () => {
      try {
        await axios.post(`${API_URL}/api/social/track-share/${itineraryId}`, {
          platform: 'facebook',
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('POST /api/social/generate-social-links/:id - Links Sociais', () => {
    it('✓ Deve gerar links para todas as redes', async () => {
      const res = await axios.post(
        `${API_URL}/api/social/generate-social-links/${itineraryId}`,
        {},
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.shareUrl).toBeDefined();
      expect(res.data.socialLinks).toBeDefined();
      expect(res.data.socialLinks.facebook).toContain('facebook.com');
      expect(res.data.socialLinks.twitter).toContain('twitter.com');
      expect(res.data.socialLinks.whatsapp).toContain('wa.me');
      expect(res.data.socialLinks.linkedin).toContain('linkedin.com');
      expect(res.data.socialLinks.telegram).toContain('t.me');
      expect(res.data.socialLinks.email).toContain('mailto:');
    });

    it('✓ Links devem conter URL compartilhável', async () => {
      const res = await axios.post(
        `${API_URL}/api/social/generate-social-links/${itineraryId}`,
        {},
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );

      expect(res.data.shareUrl).toContain(shareLink);
    });

    it('✗ Não deve gerar sem autenticação', async () => {
      try {
        await axios.post(`${API_URL}/api/social/generate-social-links/${itineraryId}`, {});
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('GET /api/social/meta-tags/:shareId - Meta Tags', () => {
    it('✓ Deve retornar meta tags Open Graph', async () => {
      const res = await axios.get(`${API_URL}/api/social/meta-tags/${shareLink}`);

      expect(res.status).toBe(200);
      expect(res.data.ogTitle).toBe('Roteiro Social Test');
      expect(res.data.ogDescription).toContain('São Paulo');
      expect(res.data.ogImage).toBeDefined();
      expect(res.data.ogUrl).toContain(shareLink);
      expect(res.data.ogType).toBe('article');
    });

    it('✓ Deve retornar meta tags Twitter Card', async () => {
      const res = await axios.get(`${API_URL}/api/social/meta-tags/${shareLink}`);

      expect(res.status).toBe(200);
      expect(res.data.twitterCard).toBe('summary_large_image');
      expect(res.data.twitterTitle).toBe('Roteiro Social Test');
      expect(res.data.twitterDescription).toContain('São Paulo');
      expect(res.data.twitterImage).toBeDefined();
    });

    it('✓ Deve retornar preview WhatsApp', async () => {
      const res = await axios.get(`${API_URL}/api/social/meta-tags/${shareLink}`);

      expect(res.status).toBe(200);
      expect(res.data.whatsappPreview).toBeDefined();
      expect(res.data.whatsappPreview.title).toBe('Roteiro Social Test');
    });

    it('✗ Deve retornar 404 para shareId inválido', async () => {
      try {
        await axios.get(`${API_URL}/api/social/meta-tags/invalid-share-id`);
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('POST /api/social/increment-view/:shareId - Visualizações', () => {
    it('✓ Deve incrementar contador de visualizações', async () => {
      const res1 = await axios.post(`${API_URL}/api/social/increment-view/${shareLink}`);
      const views1 = res1.data.views;

      const res2 = await axios.post(`${API_URL}/api/social/increment-view/${shareLink}`);
      const views2 = res2.data.views;

      expect(views2).toBe(views1 + 1);
    });

    it('✓ Deve funcionar sem autenticação (público)', async () => {
      const res = await axios.post(`${API_URL}/api/social/increment-view/${shareLink}`);
      expect(res.status).toBe(200);
      expect(res.data.views).toBeGreaterThan(0);
    });

    it('✗ Deve retornar 404 para shareId inválido', async () => {
      try {
        await axios.post(`${API_URL}/api/social/increment-view/invalid-id`);
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('GET /api/social/top-shared - Mais Compartilhados', () => {
    it('✓ Deve retornar lista de roteiros mais compartilhados', async () => {
      const res = await axios.get(`${API_URL}/api/social/top-shared`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });

    it('✓ Deve limitar resultados', async () => {
      const res = await axios.get(`${API_URL}/api/social/top-shared?limit=5`);

      expect(res.status).toBe(200);
      expect(res.data.length).toBeLessThanOrEqual(5);
    });

    it('✓ Roteiros devem ter campos necessários', async () => {
      const res = await axios.get(`${API_URL}/api/social/top-shared`);

      if (res.data.length > 0) {
        const roteiro = res.data[0];
        expect(roteiro.title).toBeDefined();
        expect(roteiro.shareCount).toBeDefined();
        expect(roteiro.shareCount).toBeGreaterThan(0);
      }
    });

    it('✓ Deve funcionar sem autenticação (público)', async () => {
      const res = await axios.get(`${API_URL}/api/social/top-shared`);
      expect(res.status).toBe(200);
    });
  });

  describe('Integração - Fluxo Completo de Compartilhamento', () => {
    it('✓ Deve completar fluxo: gerar link → compartilhar → ver stats', async () => {
      // 1. Gerar links sociais
      const linksRes = await axios.post(
        `${API_URL}/api/social/generate-social-links/${itineraryId}`,
        {},
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );
      expect(linksRes.data.socialLinks.facebook).toBeDefined();

      // 2. Registrar compartilhamento
      await axios.post(
        `${API_URL}/api/social/track-share/${itineraryId}`,
        { platform: 'facebook' },
        { headers: { Authorization: `Bearer ${ownerToken}` } }
      );

      // 3. Incrementar view
      await axios.post(`${API_URL}/api/social/increment-view/${shareLink}`);

      // 4. Verificar estatísticas
      const statsRes = await axios.get(`${API_URL}/api/social/share-stats/${itineraryId}`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      expect(statsRes.data.stats.shares).toBeGreaterThan(0);
      expect(statsRes.data.stats.views).toBeGreaterThan(0);
    });
  });
});
