/**
 * Setup Global - Testes API
 */

const { cleanupTestData, clearTracking } = require('./helpers/testCleanup');

jest.setTimeout(30000);

process.env.API_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

// Reduzir logs durante testes
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error,
};

// Helpers
global.randomString = (length = 8) => Math.random().toString(36).substring(2, length + 2);
global.randomEmail = () => `test-${randomString()}@example.com`;
global.randomName = () => {
  const names = ['João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Juliana'];
  return names[Math.floor(Math.random() * names.length)];
};

// Hook global de limpeza após TODOS os testes
afterAll(async () => {
  try {
    console.log('\n🧹 Executando limpeza global de testes de integração...');
    
    // Limpar todos os dados de teste
    await cleanupTestData({
      emailPatterns: [/@example\.com$/i, /@test\.com$/i],
      titlePatterns: [/test/i, /teste/i, /viagem/i]
    });
    
    // Limpar tracking
    clearTracking();
    
    console.log('✅ Limpeza global concluída');
  } catch (error) {
    console.error('❌ Erro na limpeza global:', error.message);
  }
});

// Dados de teste
global.testData = {
  validItinerary: {
    title: 'Viagem ao Rio de Janeiro',
    destination: {
      city: 'Rio de Janeiro',
      country: 'Brasil'
    },
    startDate: new Date(Date.now() + 86400000).toISOString(),
    endDate: new Date(Date.now() + 259200000).toISOString(),
    duration: 3,
    activities: [{
      day: 1,
      description: 'Visitar Cristo Redentor',
      location: 'Corcovado'
    }],
    budget: {
      level: 'medio',
      estimatedTotal: 1500,
      currency: 'BRL'
    },
    preferences: {
      interests: ['cultura', 'gastronomia', 'praias'],
      travelStyle: 'solo',
      pace: 'moderado'
    },
  },
};
