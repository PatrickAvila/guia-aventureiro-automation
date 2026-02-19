/**
 * Testes de Autenticação - API
 * 
 * Testa endpoints de autenticação do backend
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000';

describe('Autenticação - API', () => {
  let testUser = {
    name: '',
    email: '',
    password: 'Senha123!@#',
    acceptedTerms: true,
  };

  beforeEach(() => {
    // Gerar dados únicos para cada teste
    testUser.name = randomName();
    testUser.email = randomEmail();
  });

  describe('POST /api/auth/signup - Cadastro', () => {
    test('deve permitir cadastro com dados válidos', async () => {
      const response = await axios.post(`${API_URL}/api/auth/signup`, {
        name: testUser.name,
        email: testUser.email,
        password: testUser.password,
        acceptedTerms: testUser.acceptedTerms,
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data.user).toHaveProperty('_id');
      expect(response.data.user.email).toBe(testUser.email);
      expect(response.data.user.name).toBe(testUser.name);
    });

    test('deve rejeitar email já cadastrado', async () => {
      // Primeiro cadastro
      await axios.post(`${API_URL}/api/auth/signup`, testUser);

      // Tentar cadastrar novamente
      try {
        await axios.post(`${API_URL}/api/auth/signup`, testUser);
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toContain('já está em uso');
      }
    });

    test('deve validar formato de email', async () => {
      try {
        await axios.post(`${API_URL}/api/auth/signup`, {
          ...testUser,
          email: 'email-invalido',
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    test('deve validar senha mínima', async () => {
      try {
        await axios.post(`${API_URL}/api/auth/signup`, {
          ...testUser,
          password: '123', // Senha muito curta
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    test('deve validar campos obrigatórios', async () => {
      try {
        await axios.post(`${API_URL}/api/auth/signup`, {
          email: testUser.email,
          // Faltando name e password
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('POST /api/auth/login - Login', () => {
    beforeEach(async () => {
      // Criar usuário antes de cada teste de login
      await axios.post(`${API_URL}/api/auth/signup`, testUser);
    });

    test('deve fazer login com credenciais válidas', async () => {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data.user.email).toBe(testUser.email);
    });

    test('deve rejeitar senha incorreta', async () => {
      try {
        await axios.post(`${API_URL}/api/auth/login`, {
          email: testUser.email,
          password: 'SenhaErrada123',
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.message).toContain('incorretos');
      }
    });

    test('deve rejeitar email não cadastrado', async () => {
      try {
        await axios.post(`${API_URL}/api/auth/login`, {
          email: 'naoexiste@example.com',
          password: testUser.password,
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('POST /api/auth/refresh - Refresh Token', () => {
    let refreshToken;

    beforeEach(async () => {
      // Criar usuário e fazer login
      await axios.post(`${API_URL}/api/auth/signup`, testUser);
      const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
        email: testUser.email,
        password: testUser.password,
      });
      refreshToken = loginResponse.data.refreshToken;
    });

    test('deve renovar access token com refresh token válido', async () => {
      const response = await axios.post(`${API_URL}/api/auth/refresh`, {
        refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accessToken');
    });

    test('deve rejeitar refresh token inválido', async () => {
      try {
        await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken: 'token-invalido',
        });
        fail('Deveria ter lançado erro');
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });
});
