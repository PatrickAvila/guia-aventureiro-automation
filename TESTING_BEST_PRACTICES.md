# 🧪 Guia de Boas Práticas - Testes Automatizados

Este guia descreve padrões e boas práticas para escrever testes de automação no projeto **Guia do Aventureiro**.

## 📋 Índice

1. [Estrutura de Testes](#estrutura-de-testes)
2. [Naming Conventions](#naming-conventions)
3. [Padrões Common](#padrões-common)
4. [Tratamento de Erros](#tratamento-de-erros)
5. [Performance](#performance)
6. [Debugging](#debugging)
7. [CI/CD Integration](#cd-integration)

---

## Estrutura de Testes

### 1.1 Organização de arquivos

```
automation/
├── tests/
│   ├── auth.test.js           # Testes de autenticação
│   ├── itinerary.test.js      # Testes de roteiros
│   ├── helpers/
│   │   ├── testCleanup.js     # Limpeza de dados
│   │   ├── testRetry.js       # Retry logic
│   │   ├── testFixtures.js    # Dados de teste
│   │   └── subscriptionHelpers.js
│   └── setup.js               # Setup global
├── jest.config.js             # Config Jest
└── package.json
```

### 1.2 Estrutura de um teste

```javascript
/**
 * 📝 Descrição clara do que está sendo testado
 * 
 * Testa funcionalidade: Upload de fotos, validação, armazenamento
 */

const axios = require('axios');
const { withRetry } = require('./helpers/testRetry');
const fixtures = require('./helpers/testFixtures');

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('Fotos - Upload e Gerenciamento', () => {
  let authToken, userId, itineraryId;

  // beforeAll: Setup inicial (1 vez por suite)
  beforeAll(async () => {
    const user = fixtures.generateUniqueUser();
    const response = await axios.post(`${API_URL}/api/auth/signup`, user);
    authToken = response.data.accessToken;
    userId = response.data.user._id;
  });

  // beforeEach: Setup antes de cada teste
  beforeEach(async () => {
    const itinerary = fixtures.generateUniqueItinerary();
    const res = await axios.post(`${API_URL}/api/roteiros`, itinerary, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    itineraryId = res.data.itinerary._id;
  });

  // Testes agrupados
  describe('POST /api/roteiros/:id/photos - Upload', () => {
    test('✅ Deve fazer upload de foto válida', async () => {
      // Arrange
      const photoData = new FormData();
      photoData.append('file', createMockFile('photo.jpg'));
      
      // Act
      const response = await axios.post(
        `${API_URL}/api/roteiros/${itineraryId}/photos`,
        photoData,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.data.photo).toHaveProperty('url');
      expect(response.data.photo.url).toMatch(/https:\/\//);
    });

    test('❌ Deve rejeitar arquivo sem foto', async () => {
      try {
        await axios.post(
          `${API_URL}/api/roteiros/${itineraryId}/photos`,
          { /* body vazio */ },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });
});
```

---

## Naming Conventions

### 2.1 Nomes de teste

```javascript
// ✅ BOM - Descreve claramente o comportamento
test('✅ Deve fazer login com credenciais válidas', async () => {});

// ✅ BOM - Indica erro esperado
test('❌ Deve rejeitar email não confirmado', async () => {});

// ✅ BOM - Indica comportamento que não foi implementado
test.skip('✅ Deve retirar 50 XP por viagem (NÃO IMPLEMENTADO)', async () => {});

// ❌ RUIM - Vago
test('funciona', async () => {});

// ❌ RUIM - Falta contexto
test('teste de login', async () => {});
```

### 2.2 Nomes de suites

```javascript
// ✅ BOM - Clareza sobre funcionalidade
describe('POST /api/auth/signup - Cadastro de Usuários', () => {});

// ✅ BOM - Com emoji para visualizar rapidamente
describe('🏆 Gamificação - Badges e XP', () => {});

// ❌ RUIM - Genérico
describe('Auth Tests', () => {});
```

---

## Padrões Comun

### 3.1 Padrão AAA (Arrange, Act, Assert)

```javascript
test('deve atualizar nome do perfil', async () => {
  // 1️⃣ ARRANGE - Preparar dados
  const user = fixtures.generateUniqueUser();
  const signupRes = await axios.post(`${API_URL}/api/auth/signup`, user);
  const authToken = signupRes.data.accessToken;
  const userId = signupRes.data.user._id;

  // 2️⃣ ACT - Executar ação
  const updateRes = await axios.put(
    `${API_URL}/api/users/${userId}/profile`,
    { name: 'Novo Nome' },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  // 3️⃣ ASSERT - Validar resultado
  expect(updateRes.status).toBe(200);
  expect(updateRes.data.user.name).toBe('Novo Nome');
});
```

### 3.2 Usando Fixtures

```javascript
// ❌ RUIM - Dados hardcoded em múltiplos testes
test('teste 1', async () => {
  const user = { name: 'João', email: 'joao@test.com', password: 'Senha@123' };
  // ...
});

test('teste 2', async () => {
  const user = { name: 'João', email: 'joao@test.com', password: 'Senha@123' };
  // ...
});

// ✅ BOM - Dados centralizados
const fixtures = require('./helpers/testFixtures');

test('teste 1', async () => {
  const user = fixtures.users.valid;
  // ...
});

test('teste 2', async () => {
  const user = fixtures.generateUniqueUser();  // Sem duplicatas!
  // ...
});
```

### 3.3 Usando Retry para testes flaky

```javascript
const { withRetry, axiosWithRetry } = require('./helpers/testRetry');

// Para operações que podem falhar temporariamente
test('deve processar com IA (que pode ser lenta)', async () => {
  const response = await withRetry(
    async () => {
      return await axios.post(`${API_URL}/api/ai/generate`, {
        destination: 'Paris',
        budget: 1500
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    },
    {
      maxRetries: 3,        // Tenta até 3x
      delayMs: 1000,        // Começar com 1s, depois 2s, 4s (backoff)
      ignoreErrors: [
        /validation error/i  // Não retry se for erro de validação
      ]
    }
  );

  expect(response.data.itinerary).toBeDefined();
});

// Ou usar helper específico para axios
test('com retry automático', async () => {
  const response = await axiosWithRetry(axios, {
    method: 'GET',
    url: `${API_URL}/api/recommendations`,
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  expect(response.status).toBe(200);
});
```

---

## Tratamento de Erros

### 4.1 Testar erros esperados

```javascript
// ✅ BOM - Verifica que erro é lançado
test('❌ Deve rejeitar email duplicado', async () => {
  const user = fixtures.generateUniqueUser();
  
  // Primeiro cadastro OK
  await axios.post(`${API_URL}/api/auth/signup`, user);
  
  // Segundo cadastro deve falhar
  try {
    await axios.post(`${API_URL}/api/auth/signup`, user);
    fail('Deveria ter lançado erro');  // ← Obriga erro
  } catch (error) {
    expect(error.response.status).toBe(400);
    expect(error.response.data.message).toContain('já está em uso');
  }
});

// ❌ RUIM - Não garante que erro foi lançado
test('deve rejeitar email duplicado', async () => {
  const user = fixtures.generateUniqueUser();
  await axios.post(`${API_URL}/api/auth/signup`, user);
  await axios.post(`${API_URL}/api/auth/signup`, user);
  // Teste passa mesmo se erro NÃO foi lançado!
});
```

### 4.2 Verificar status HTTP

```javascript
// ✅ BOM - Explícito sobre o que se espera
test('❌ Deve retornar 404 para roteiro inexistente', async () => {
  try {
    await axios.get(
      `${API_URL}/api/roteiros/invalid-id`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    fail('Deveria retornar 404');
  } catch (error) {
    expect(error.response.status).toBe(404);
  }
});
```

### 4.3 Logar erros úteis

```javascript
const { sleep } = require('./helpers/testRetry');

test('teste com melhor logging', async () => {
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'test@test.com',
      password: 'wrong-password'
    });
  } catch (error) {
    if (__DEV__) {
      console.error('Erro na chamada:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        data: error.response?.data,
      });
    }
    throw error;
  }
});
```

---

## Performance

### 5.1 Evitar testes lentos

```javascript
// ❌ RUIM - Teste muito lento (delay desnecessário)
test('com delay grande', async () => {
  await sleep(5000);  // 5 segundos!
  const response = await axios.get(`${API_URL}/api/user`);
  expect(response.status).toBe(200);
});

// ✅ BOM - Apenas delays necessários
test('com delay mínimo', async () => {
  // Para dar tempo ao backend processar (geralmente 100-500ms é suficiente)
  await sleep(100);
  const response = await axios.get(`${API_URL}/api/user`);
  expect(response.status).toBe(200);
});
```

### 5.2 Reutilizar dados entre testes

```javascript
// ❌ RUIM - Cria novo usuário para cada teste
describe('User Tests', () => {
  test('teste 1', async () => {
    const user = fixtures.generateUniqueUser();
    const res = await axios.post(`${API_URL}/api/auth/signup`, user);
    // teste...
  });
  
  test('teste 2', async () => {
    const user = fixtures.generateUniqueUser();  // ← Novo usuário criado!
    const res = await axios.post(`${API_URL}/api/auth/signup`, user);
    // teste...
  });
});

// ✅ BOM - Reutiliza usuário na suite
describe('User Tests', () => {
  let authToken;
  
  beforeAll(async () => {
    const user = fixtures.generateUniqueUser();
    const res = await axios.post(`${API_URL}/api/auth/signup`, user);
    authToken = res.data.accessToken;
  });
  
  test('teste 1', async () => {
    const response = await axios.get(`${API_URL}/api/user`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    // teste... - reutiliza mesmo usuário
  });
  
  test('teste 2', async () => {
    // teste... - mesmo usuário, mais rápido!
  });
});
```

---

## Debugging

### 6.1 Executar testes com detalhes

```bash
# Executar com verbose output
VERBOSE=true npm test

# Executar teste específico
npm test -- auth.test.js

# Executar com debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### 6.2 Logging condicional

```javascript
// Apenas log em desenvolvimento
if (process.env.VERBOSE === 'true') {
  console.log('User created:', userId);
  console.log('Token:', authToken);
}

// Ou usar logger customizado
const log = process.env.VERBOSE === 'true' ? console.log : () => {};
log('Debug info:', data);
```

### 6.3 Dar dump de estado

```javascript
test('debug com estado', async () => {
  const user = fixtures.generateUniqueUser();
  const signupRes = await axios.post(`${API_URL}/api/auth/signup`, user);
  
  if (signupRes.status !== 201) {
    console.error('❌ Signup retornou:', {
      status: signupRes.status,
      data: signupRes.data,
    });
    throw new Error('Signup falhou');
  }
  
  expect(signupRes.status).toBe(201);
});
```

---

## CI/CD Integration

### 7.1 Executar testes no pipeline

```bash
# Executar com retry (CI/CD)
RETRY=true npm run test:ci

# Gerar coverage report
npm run test:coverage

# Executar testes rápidos (skip lentos)
npm run test:quick
```

### 7.2 Interpretar resultados

```
PASS  tests/auth.test.js
  ✓ Autenticação - 16 testes passando

PASS  tests/itinerary.test.js
  ✓ Roteiros - 14 testes passando (2 skipped)

Test Suites: 16 passed, 16 total
Tests:       223 passed, 14 skipped, 237 total
```

---

## Checklist para Novo Teste

- [ ] Usa Arrange-Act-Assert pattern
- [ ] Nome descreve claramente o comportamento
- [ ] Usa fixtures quando possível
- [ ] Trata erros explicitamente (try/catch ou expect.throws)
- [ ] Não tem delays desnecessários
- [ ] Logs úteis para debugging
- [ ] beforeAll/beforeEach otimizados
- [ ] Reutiliza dados entre testes quando possível
- [ ] Testa happy path E edge cases
- [ ] Está no arquivo correto (by feature)

---

## Recursos Úteis

- [Jest Documentation](https://jestjs.io/)
- [Axios Documentation](https://axios-http.com/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [README_TESTS.md](./README_TESTS.md) - Status completo dos testes
