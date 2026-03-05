/**
 * Test Fixtures - Dados de teste centralizados e reutilizáveis
 * Facilita manutenção e consistência entre testes
 */

module.exports = {
  /**
   * Usuários de teste com diferentes perfis
   */
  users: {
    valid: {
      name: 'João da Silva',
      email: 'joao@test.com',
      password: 'Senha@123',
      acceptedTerms: true,
    },
    premium: {
      name: 'Maria Premium',
      email: 'maria@test.com',
      password: 'Senha@123',
      acceptedTerms: true,
      subscriptionTier: 'premium',
    },
    invalid: {
      name: '',
      email: 'invalid-email',
      password: '123',  // Senha fraca
      acceptedTerms: false,
    },
  },

  /**
   * Roteiros de teste
   */
  itineraries: {
    rio: {
      title: 'Roteiro Rio de Janeiro',
      destination: {
        city: 'Rio de Janeiro',
        country: 'Brasil',
        coordinates: {
          latitude: -22.9068,
          longitude: -43.1729,
        },
      },
      startDate: new Date('2024-05-01').toISOString(),
      endDate: new Date('2024-05-05').toISOString(),
      duration: 5,
      activities: [
        {
          day: 1,
          description: 'Visitar Cristo Redentor',
          location: 'Corcovado',
        },
        {
          day: 2,
          description: 'Praia de Copacabana',
          location: 'Copacabana',
        },
      ],
      budget: {
        level: 'medio',
        estimatedTotal: 1500,
        currency: 'BRL',
      },
      preferences: {
        interests: ['cultura', 'praias', 'gastronomia'],
        travelStyle: 'solo',
        pace: 'moderado',
      },
    },

    paris: {
      title: 'Roteiro Paris',
      destination: {
        city: 'Paris',
        country: 'França',
        coordinates: {
          latitude: 48.8566,
          longitude: 2.3522,
        },
      },
      startDate: new Date('2024-07-01').toISOString(),
      endDate: new Date('2024-07-07').toISOString(),
      duration: 7,
      budget: {
        level: 'alto',
        estimatedTotal: 3500,
        currency: 'EUR',
      },
      preferences: {
        interests: ['museus', 'gastronomia', 'compras'],
        travelStyle: 'casal',
        pace: 'relaxado',
      },
    },

    invalid: {
      title: '',  // Títully vazio
      destination: { city: '', country: '' },  // Destino vazio
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() - 86400000).toISOString(),  // Fim antes do início
    },
  },

  /**
   * Dados para testes de budget
   */
  budget: {
    lowBudget: {
      level: 'baixo',
      estimatedTotal: 500,
      currency: 'BRL',
    },
    mediumBudget: {
      level: 'medio',
      estimatedTotal: 1500,
      currency: 'BRL',
    },
    highBudget: {
      level: 'alto',
      estimatedTotal: 5000,
      currency: 'BRL',
    },
  },

  /**
   * Dados para testes de gamificação
   */
  gamification: {
    achievements: [
      { id: 'first_trip', name: 'Primeira Viagem', icon: '✈️' },
      { id: 'five_trips', name: 'Explorador Novato', icon: '🗺️' },
      { id: 'budget_master', name: 'Mestre do Orçamento', icon: '💰' },
    ],
    badges: [
      { id: 'explorer', name: 'Explorador', level: 1 },
      { id: 'planner', name: 'Planejador', level: 2 },
      { id: 'social', name: 'Social Butterfly', level: 3 },
    ],
  },

  /**
   * Dados para testes de social sharing
   */
  social: {
    platforms: ['facebook', 'whatsapp', 'instagram', 'twitter'],
    shareData: {
      title: 'Veja meu roteiro Amazing Rio!',
      description: 'Um roteiro incrível pelo Rio de Janeiro',
      image: 'https://example.com/image.jpg',
      url: 'https://app.guia-aventureiro.com/share/abc123',
    },
  },

  /**
   * Dados para testes de notificações
   */
  notifications: {
    types: ['invite', 'comment', 'like', 'share', 'achievement'],
    templates: {
      invite: 'João te convidou para colaborar no roteiro: Paris 2024',
      comment: 'Maria comentou no seu roteiro: "Que legal!"',
      like: 'Pedro curtiu seu roteiro!',
      share: 'Ana compartilhou seu roteiro',
      achievement: 'Você conquistou: Explorador Novato!',
    },
  },

  /**
   * Emails de teste padrão
   */
  emails: {
    valid: 'teste@example.com',
    invalid: 'not-an-email',
    spam: 'spam@mailinator.com',
    temporary: 'temp@tempmail.com',
  },

  /**
   * Senhas para testes
   */
  passwords: {
    valid: 'SenhaForte@123',
    weak: '123456',
    veryWeak: '123',
    noUppercase: 'senha@123',
    noSpecialChar: 'Senha123',
    noNumber: 'Senha@abc',
  },

  /**
   * Coordenadas geográficas para testes de mapa
   */
  coordinates: {
    rioCorcovado: { latitude: -22.9519, longitude: -43.2105 },
    parisioParis: { latitude: 48.8629, longitude: 2.2945 },
    tokyoTower: { latitude: 35.6762, longitude: 139.7394 },
    sydneyOpera: { latitude: -33.8568, longitude: 151.2153 },
  },

  /**
   * Gerar usuário único (para evitar duplicatas em testes)
   */
  generateUniqueUser: (baseEmail = 'test@example.com') => ({
    name: `User ${Date.now()}`,
    email: `${Date.now()}-${baseEmail}`,
    password: 'SenhaForte@123',
    acceptedTerms: true,
  }),

  /**
   * Gerar roteiro único
   */
  generateUniqueItinerary: (baseName = 'Roteiro') => ({
    title: `${baseName} ${Date.now()}`,
    destination: {
      city: 'São Paulo',
      country: 'Brasil',
    },
    startDate: new Date(Date.now() + 86400000).toISOString(),  // Amanhã
    endDate: new Date(Date.now() + 259200000).toISOString(),  // 3 dias depois
    duration: 3,
    budget: {
      level: 'medio',
      estimatedTotal: 1500,
      currency: 'BRL',
    },
  }),
};
