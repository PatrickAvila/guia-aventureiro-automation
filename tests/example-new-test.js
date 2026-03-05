/**
 * 📝 EXEMPLO - Novo teste usando as melhorias implementadas
 * 
 * Este arquivo demonstra como usar:
 * - Test Fixtures
 * - Retry Logic
 * - Boas Práticas (Arrange-Act-Assert)
 * 
 * Salve como: automation/tests/example-new-test.js
 * (Este é apenas um exemplo, pode ser deletado)
 */

const axios = require('axios');
const { withRetry, axiosWithRetry, sleep } = require('./helpers/testRetry');
const fixtures = require('./helpers/testFixtures');

const API_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * 🧪 Suite de testes de exemplo
 * Demonstra padrões recomendados e novas utilities
 */
describe('📝 EXEMPLO - Testes com Novas Features', () => {
  let authToken;
  let userId;
  let itineraryId;

  /**
   * beforeAll: Setup inicial (executado 1x antes de todos os testes)
   * Usa fixtures para criar usuário único
   */
  beforeAll(async () => {
    console.log('\n🔧 Setup inicial...');
    
    // ✨ Usa fixture centralizado com email único
    const user = fixtures.generateUniqueUser();
    
    // ✨ Usa retry logic para operação que pode falhar
    const response = await withRetry(
      () => axios.post(`${API_URL}/api/auth/signup`, user),
      {
        maxRetries: 2,
        delayMs: 500,
      }
    );

    authToken = response.data.accessToken;
    userId = response.data.user._id;
    
    console.log('✅ Setup concluído - Usuário:', user.email);
  });

  /**
   * Exemplo 1: Usando Fixtures Básico
   */
  describe('🎯 Exemplo 1 - Fixtures Básicos', () => {
    test('✅ Deve criar roteiro com fixture centralizado', async () => {
      // ARRANGE
      // ✨ Usa fixture pré-definido (Rio)
      const itineraryData = fixtures.itineraries.rio;

      // ACT
      const response = await axios.post(
        `${API_URL}/api/roteiros`,
        itineraryData,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      // ASSERT
      expect(response.status).toBe(201);
      expect(response.data.itinerary).toHaveProperty('_id');
      expect(response.data.itinerary.title).toBe(itineraryData.title);
      expect(response.data.itinerary.destination.city).toBe('Rio de Janeiro');

      // Guardar para testes posteriores
      itineraryId = response.data.itinerary._id;
    });

    test('❌ Deve rejeitar roteiro inválido (fixture inválido)', async () => {
      // ARRANGE
      // ✨ Usa fixture de dados inválidos
      const invalidData = fixtures.itineraries.invalid;

      // ACT & ASSERT
      try {
        await axios.post(
          `${API_URL}/api/roteiros`,
          invalidData,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  /**
   * Exemplo 2: Usando Retry Logic para APIs Instáveis
   */
  describe('🎯 Exemplo 2 - Retry Logic para IA (instável)', () => {
    test('✅ Deve gerar roteiro com IA (com retry automático)', async () => {
      // ARRANGE
      const prompt = 'Roteiro para Paris 5 dias';

      // ACT
      // ✨ withRetry faz com que a operação seja repetida se falhar
      // (Útil para APIs externas como IA que podem ser lentas)
      const response = await withRetry(
        () => axios.post(
          `${API_URL}/api/ai/generate`,
          { prompt },
          { headers: { Authorization: `Bearer ${authToken}` } }
        ),
        {
          maxRetries: 3,           // Tenta até 3x
          delayMs: 1000,           // Começa com 1s, depois 2s, 4s (backoff)
          onRetry: ({ attempt, error, nextDelayMs }) => {
            console.log(`  ⏱️  Retry ${attempt}/3 em ${nextDelayMs}ms: ${error.message}`);
          },
          ignoreErrors: [
            /validation error/i,   // Não retry erro de validação
            /unauthorized/i,       // Não retry errors de auth
          ],
        }
      );

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.data.itinerary).toBeDefined();
    });

    test('✅ Usar helper específico para axios (mais direto)', async () => {
      // ARRANGE & ACT
      // ✨ axiosWithRetry é um helper específico para axios
      const response = await axiosWithRetry(axios, {
        method: 'GET',
        url: `${API_URL}/api/recommendations`,
        headers: { Authorization: `Bearer ${authToken}` },
        params: { destination: 'Paris' },
      }, {
        maxRetries: 2,
        delayMs: 500,
      });

      // ASSERT
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.recommendations)).toBe(true);
    });
  });

  /**
   * Exemplo 3: Gerar Dados Únicos (Factory Pattern)
   */
  describe('🎯 Exemplo 3 - Factory Pattern (dados únicos)', () => {
    test('✅ Cada teste recebe roteiro único', async () => {
      // ✨ generateUniqueItinerary() garante que cada teste tem um roteiro diferente
      // (Evita problemas de duplicatas no banco se testes rodarem em paralelo)
      const itinerary1 = fixtures.generateUniqueItinerary('Viagem 1');
      const itinerary2 = fixtures.generateUniqueItinerary('Viagem 2');

      // Verificar que são diferentes
      expect(itinerary1.title).not.toBe(itinerary2.title);
      expect(itinerary1.title).toContain('Viagem 1');
      expect(itinerary2.title).toContain('Viagem 2');
    });

    test('❌ Emails duplicados são evitados com fixtures', async () => {
      // ✨ Cada chamada do generateUniqueUser() retorna email diferente
      const user1 = fixtures.generateUniqueUser();
      const user2 = fixtures.generateUniqueUser();

      // Mesmo que ambos sejam "test@example.com", o timestamp faz serem únicos
      expect(user1.email).not.toBe(user2.email);
      console.log('User 1:', user1.email);
      console.log('User 2:', user2.email);
    });
  });

  /**
   * Exemplo 4: Padrão AAA (Arrange-Act-Assert)
   */
  describe('🎯 Exemplo 4 - Padrão AAA', () => {
    test('✅ Seguindo padrão AAA claramente', async () => {
      // 1️⃣ ARRANGE - Preparar dados de teste
      const updatedData = {
        title: 'Roteiro Atualizado',
      };

      // 2️⃣ ACT - Executar ação
      const response = await axios.put(
        `${API_URL}/api/roteiros/${itineraryId}`,
        updatedData,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      // 3️⃣ ASSERT - Validar resultado
      expect(response.status).toBe(200);
      expect(response.data.itinerary.title).toBe('Roteiro Atualizado');
    });
  });

  /**
   * Exemplo 5: Tratamento de Erros
   */
  describe('🎯 Exemplo 5 - Tratamento de Erros', () => {
    test('❌ Deve validar erro esperado', async () => {
      // ARRANGE
      const invalidItinerary = {
        title: '', // Título vazio - inválido
      };

      // ACT & ASSERT
      try {
        await axios.post(
          `${API_URL}/api/roteiros`,
          invalidItinerary,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        fail('Deveria ter lançado erro - titulo obrigatório');
      } catch (error) {
        // ✨ Verificações explícitas de erro
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('message');
      }
    });

    test('❌ Deve rejeitar sem token de autenticação', async () => {
      try {
        await axios.get(`${API_URL}/api/roteiros`);
        fail('Deveria ter lançado 401');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });

    test('❌ Deve retornar 404 para recurso inexistente', async () => {
      try {
        await axios.get(
          `${API_URL}/api/roteiros/invalid-id-999`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        fail('Deveria ter retornado 404');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  /**
   * Exemplo 6: Usando diferentes tipos de fixtures
   */
  describe('🎯 Exemplo 6 - Fixtures Variados', () => {
    test('✅ Usar fixture de orçamento baixo', async () => {
      const itinerary = fixtures.generateUniqueItinerary();
      // ✨ Usar fixture de orçamento
      itinerary.budget = fixtures.budget.lowBudget;

      const response = await axios.post(
        `${API_URL}/api/roteiros`,
        itinerary,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.data.itinerary.budget.level).toBe('baixo');
      expect(response.data.itinerary.budget.estimatedTotal).toBe(500);
    });

    test('✅ Usar coordenadas geográficas reais', async () => {
      const itinerary = fixtures.generateUniqueItinerary();
      // ✨ Usar coordenadas reais do Rio
      itinerary.destination.coordinates = fixtures.coordinates.rioCorcovado;

      const response = await axios.post(
        `${API_URL}/api/roteiros`,
        itinerary,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(response.data.itinerary.destination.coordinates.latitude).toBe(-22.9519);
    });
  });

  /**
   * Exemplo 7: Performance e timing
   */
  describe('🎯 Exemplo 7 - Performance', () => {
    test('✅ Deve responder em menos de 500ms', async () => {
      const startTime = Date.now();

      const response = await axios.get(
        `${API_URL}/api/roteiros`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      const duration = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
      
      if (process.env.VERBOSE === 'true') {
        console.log(`  ⚡ Resposta em ${duration}ms`);
      }
    });
  });

});

// ============================================
// RESUMO DO QUE FOI DEMONSTRADO
// ============================================

/*
✨ FEATURES USADAS NESTE ARQUIVO:

1. Fixtures Centralizados
   ✅ fixtures.itineraries.rio - Dados pré-definidos
   ✅ fixtures.generateUniqueUser() - Factory para dados únicos
   ✅ fixtures.generateUniqueItinerary() - Factory para roteiros
   ✅ fixtures.budget.lowBudget - Dados segmentados
   ✅ fixtures.coordinates.rioCorcovado - Dados geográficos

2. Retry Logic
   ✅ withRetry() - Para operações que podem falhar
   ✅ axiosWithRetry() - Helper específico para axios
   ✅ maxRetries, delayMs, onRetry callbacks
   ✅ ignoreErrors - Definir quais erros NÃO fazem retry

3. Padrões de Teste
   ✅ AAA Pattern (Arrange-Act-Assert)
   ✅ beforeAll/beforeEach setup
   ✅ Nomes descritivos com ✅/❌ prefixes
   ✅ Agrupamento de testes com describe()

4. Boas Práticas
   ✅ Tratamento explícito de erros
   ✅ Verificações de status HTTP
   ✅ Reutilizar dados entre testes
   ✅ Logging condicional com VERBOSE
   ✅ Performance assertions

5. Recursos Disponíveis
   ✅ todos os helpers em tests/helpers/
   ✅ documentação em TESTING_BEST_PRACTICES.md
   ✅ relatório visual com: npm run test:report

🚀 PRÓXIMO PASSO:
Abra este arquivo, estude os exemplos e adapte para seus testes!
*/
