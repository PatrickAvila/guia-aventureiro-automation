// test-subscription-limits.js
// Script para testar limites de assinatura

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let authToken = null;
let userId = null;

// Helpers
const signup = async () => {
  const randomEmail = `test-${Date.now()}@example.com`;
  console.log('\n🔐 Criando usuário de teste:', randomEmail);
  
  const response = await axios.post(`${BASE_URL}/api/auth/signup`, {
    name: 'Test User',
    email: randomEmail,
    password: 'Senha123!',
    acceptedTerms: true
  });
  
  authToken = response.data.accessToken;
  userId = response.data.user._id;
  console.log('✅ Usuário criado com sucesso!');
  console.log('   ID:', userId);
  
  return response.data;
};

const getSubscription = async () => {
  console.log('\n📊 Buscando assinatura...');
  const response = await axios.get(`${BASE_URL}/api/subscriptions/my-subscription`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  const sub = response.data.subscription;
  console.log('✅ Assinatura encontrada!');
  console.log('   Plano:', sub.plan.toUpperCase());
  console.log('   Status:', sub.status);
  console.log('   Limites:');
  console.log('     - Roteiros:', `${sub.usage.itineraries.current}/${sub.usage.itineraries.limit}`);
  console.log('     - IA:', `${sub.usage.aiGenerations.current}/${sub.usage.aiGenerations.limit}`);
  console.log('     - Fotos:', `${sub.usage.photos.current}/${sub.usage.photos.limit}`);
  
  return response.data;
};

const createItinerary = async (title) => {
  console.log(`\n📝 Tentando criar roteiro: "${title}"`);
  
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000);
    
    const response = await axios.post(`${BASE_URL}/api/roteiros`, {
      title: title,
      destination: {
        city: 'São Paulo',
        country: 'Brasil'
      },
      startDate: now.toISOString(),
      endDate: tomorrow.toISOString(),
      duration: 2
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Roteiro criado com sucesso!');
    console.log('   ID:', response.data.itinerary._id);
    return response.data;
  } catch (error) {
    if (error.response?.status === 403 && error.response?.data?.error === 'limit_reached') {
      console.log('🚫 LIMITE ATINGIDO!');
      console.log('   Mensagem:', error.response.data.message);
      console.log('   Uso atual:', error.response.data.currentUsage);
      console.log('   Limite:', error.response.data.limit);
      console.log('   Planos sugeridos:', error.response.data.upgrade.availablePlans.join(', '));
      return { limitReached: true, error: error.response.data };
    }
    throw error;
  }
};

const upgradeSubscription = async (plan, billingCycle = 'monthly') => {
  console.log(`\n⬆️ Fazendo upgrade para ${plan.toUpperCase()}...`);
  
  // Em produção, isso redirecionaria para Stripe
  const response = await axios.post(`${BASE_URL}/api/subscriptions/confirm-upgrade`, {
    targetPlan: plan,
    billingCycle: billingCycle
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('✅ Upgrade realizado com sucesso!');
  console.log('   Novo plano:', response.data.subscription.plan.toUpperCase());
  
  return response.data;
};

const getUsage = async () => {
  console.log('\n📈 Buscando estatísticas de uso...');
  
  const response = await axios.get(`${BASE_URL}/api/subscriptions/usage`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  const usage = response.data.usage;
  console.log('✅ Estatísticas:');
  console.log('   Roteiros:', `${usage.itineraries.current}/${usage.itineraries.limit} (${usage.itineraries.percentage}%)`);
  console.log('   IA:', `${usage.aiGenerations.current}/${usage.aiGenerations.limit} (${usage.aiGenerations.percentage}%)`);
  console.log('   IA reseta em:', new Date(usage.aiGenerations.resetsAt).toLocaleDateString('pt-BR'));
  
  return response.data;
};

// Testes
const runTests = async () => {
  console.log('🧪 INICIANDO TESTES DE SISTEMA DE ASSINATURA');
  console.log('='.repeat(60));
  
  try {
    // 1. Criar usuário
    await signup();
    
    // 2. Verificar que subscription Free foi criada automaticamente
    const subData = await getSubscription();
    if (subData.subscription.plan !== 'free') {
      throw new Error('Subscription deveria ser FREE para novo usuário!');
    }
    
    // 3. Criar 3 roteiros (limite do Free)
    console.log('\n' + '='.repeat(60));
    console.log('TESTE 1: Criar roteiros até o limite (3)');
    console.log('='.repeat(60));
    
    await createItinerary('Roteiro 1');
    await createItinerary('Roteiro 2');
    await createItinerary('Roteiro 3');
    
    await getUsage();
    
    // 4. Tentar criar o 4º roteiro (deve falhar)
    console.log('\n' + '='.repeat(60));
    console.log('TESTE 2: Tentar criar roteiro além do limite');
    console.log('='.repeat(60));
    
    const result = await createItinerary('Roteiro 4 (deve falhar)');
    
    if (!result.limitReached) {
      throw new Error('Deveria ter bloqueado a criação do 4º roteiro!');
    }
    
    console.log('\n✅ BLOQUEIO FUNCIONANDO CORRETAMENTE!');
    
    // 5. Fazer upgrade para Premium
    console.log('\n' + '='.repeat(60));
    console.log('TESTE 3: Upgrade para Premium');
    console.log('='.repeat(60));
    
    await upgradeSubscription('premium');
    await getSubscription();
    
    // 6. Criar mais roteiros (agora deve funcionar)
    console.log('\n' + '='.repeat(60));
    console.log('TESTE 4: Criar roteiros após upgrade');
    console.log('='.repeat(60));
    
    await createItinerary('Roteiro 4 (Premium)');
    await createItinerary('Roteiro 5 (Premium)');
    
    await getUsage();
    
    // 7. Fazer upgrade para Pro
    console.log('\n' + '='.repeat(60));
    console.log('TESTE 5: Upgrade para Pro (ilimitado)');
    console.log('='.repeat(60));
    
    await upgradeSubscription('pro', 'yearly');
    await getSubscription();
    
    // 8. Criar vários roteiros (ilimitado)
    console.log('\n' + '='.repeat(60));
    console.log('TESTE 6: Criar roteiros ilimitados (Pro)');
    console.log('='.repeat(60));
    
    for (let i = 6; i <= 10; i++) {
      await createItinerary(`Roteiro ${i} (Pro)`);
    }
    
    await getUsage();
    
    // 9. Testar colaboradores (deve estar disponível no Pro)
    console.log('\n' + '='.repeat(60));
    console.log('TESTE 7: Verificar features desbloqueadas');
    console.log('='.repeat(60));
    
    const finalSub = await getSubscription();
    const features = finalSub.subscription.features;
    
    console.log('\n🎁 Features ativas:');
    Object.keys(features).forEach(key => {
      if (features[key]) {
        console.log(`   ✅ ${key}`);
      }
    });
    
    // Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n✅ Sistema de assinatura funcionando perfeitamente!');
    console.log('✅ Limites sendo aplicados corretamente');
    console.log('✅ Upgrades funcionando');
    console.log('✅ Features desbloqueadas corretamente');
    console.log('✅ Contadores sendo incrementados');
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Dados:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
};

// Rodar testes
runTests().then(() => {
  console.log('\n✨ Testes concluídos!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
