// Test jest axios behavior
const axios = require('axios');
const crypto = require('crypto');

const API_URL = 'http://localhost:3000';

async function testJest() {
  const uniqueId = crypto.randomUUID();
  const email = `jest-test-${uniqueId}@test.com`;
  
  const payload = {
    name: 'Jest Test',
    email,
    password: 'Senha@123',
    acceptedTerms: true,
  };
  
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('acceptedTerms type:', typeof payload.acceptedTerms);
  console.log('acceptedTerms value:', payload.acceptedTerms);
  console.log('acceptedTerms === true:', payload.acceptedTerms === true);
  
  try {
    const res = await axios.post(`${API_URL}/api/auth/signup`, payload);
    console.log('\n✓ Sucesso!');
    console.log('Status:', res.status);
    console.log('User:', res.data.user.email);
  } catch (error) {
    console.log('\n✗ Erro!');
    console.log('Status:', error.response?.status);
    console.log('Mensagem:', error.response?.data?.message);
    console.log('Erros:', JSON.stringify(error.response?.data?.errors, null, 2));
  }
}

testJest();
