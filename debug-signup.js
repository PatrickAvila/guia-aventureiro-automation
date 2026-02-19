// Debug script to test signup
const axios = require('axios');
const crypto = require('crypto');

const API_URL = 'http://localhost:3000';

async function test() {
  try {
    const uniqueId = crypto.randomUUID();
    const email = `debug-${uniqueId}@test.com`;
    
    console.log(`Tentando criar usuário com email: ${email}`);
    
    const res = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Debug User',
      email,
      password: 'Senha@123',
      acceptedTerms: true,
    });
    
    console.log('✓ Sucesso!');
    console.log('Status:', res.status);
    console.log('User ID:', res.data.user._id);
    console.log('Token:', res.data.accessToken.substring(0, 20) + '...');
    
  } catch (error) {
    console.error('✗ Erro!');
    console.error('Status:', error.response?.status);
    console.error('Mensagem:', error.response?.data?.message);
    console.error('Erro completo:', error.response?.data);
  }
}

test();
