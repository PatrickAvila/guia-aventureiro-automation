// Script de teste rápido para validar upgrade PREMIUM
const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testUpgrade() {
  try {
    console.log('🧪 Testando upgrade PREMIUM...\n');
    
    // 1. Criar usuário
    const email = `test-upgrade-${Date.now()}@test.com`;
    console.log(`📝 Criando usuário: ${email}`);
    const signupRes = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Test Upgrade User',
      email,
      password: 'Senha@123',
      acceptedTerms: true,
    });
    const token = signupRes.data.accessToken;
    console.log('✅ Usuário criado\n');
    
    // 2. Verificar plano inicial
    console.log('📊 Verificando subscription inicial...');
    const subRes1 = await axios.get(`${API_URL}/api/subscriptions/my-subscription`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const sub1 = subRes1.data.subscription || subRes1.data;
    console.log(`   Plano atual: ${sub1.plan.toUpperCase()}`);
    console.log(`   Colaboradores: ${sub1.usage?.collaborators?.limit || 0}\n`);
    
    // 3. Fazer upgrade para PREMIUM
    console.log('⬆️  Fazendo upgrade para PREMIUM...');
    const upgradeRes = await axios.post(
      `${API_URL}/api/subscriptions/confirm-upgrade`,
      { 
        targetPlan: 'premium',
        billingCycle: 'monthly'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Upgrade realizado\n');
    
    // 4. Verificar plano após upgrade
    console.log('📊 Verificando subscription após upgrade...');
    const subRes2 = await axios.get(`${API_URL}/api/subscriptions/my-subscription`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const sub2 = subRes2.data.subscription || subRes2.data;
    console.log(`   Plano atual: ${sub2.plan.toUpperCase()}`);
    console.log(`   Colaboradores: ${sub2.usage?.collaborators?.limit || 0}`);
    console.log(`   Roteiros: ${sub2.usage?.itineraries?.limit || 0}\n`);
    
    // 5. Criar roteiro e adicionar colaborador
    console.log('📝 Criando roteiro...');
    const itineraryRes = await axios.post(`${API_URL}/api/roteiros`, {
      title: 'Test Itinerary',
      destination: { city: 'São Paulo', country: 'Brasil' },
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      duration: 1,
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const itineraryId = itineraryRes.data.itinerary._id;
    console.log('✅ Roteiro criado\n');
    
    // 6. Criar colaborador
    const collabEmail = `collab-${Date.now()}@test.com`;
    console.log(`📝 Criando colaborador: ${collabEmail}`);
    const collabSignup = await axios.post(`${API_URL}/api/auth/signup`, {
      name: 'Collaborator',
      email: collabEmail,
      password: 'Senha@123',
      acceptedTerms: true,
    });
    console.log('✅ Colaborador criado\n');
    
    // 7. Adicionar colaborador ao roteiro
    console.log('👥 Adicionando colaborador ao roteiro...');
    const addCollabRes = await axios.post(
      `${API_URL}/api/roteiros/${itineraryId}/collaborators`,
      {
        email: collabEmail,
        permission: 'edit'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Colaborador adicionado com sucesso!\n');
    
    // 8. Compartilhar roteiro
    console.log('🔗 Compartilhando roteiro...');
    const shareRes = await axios.post(
      `${API_URL}/api/roteiros/${itineraryId}/share`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`✅ Roteiro compartilhado: ${shareRes.data.shareId}`);
    console.log(`   Link: ${shareRes.data.shareLink}\n`);
    
    console.log('🎉 TODOS OS TESTES PASSARAM!');
    console.log('✅ Upgrade funcionando');
    console.log('✅ Colaboradores funcionando');
    console.log('✅ Compartilhamento funcionando\n');
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testUpgrade();
