/**
 * Script de Teste: Validação de Owner no Itinerary
 * 
 * Testa se o hook pre('save') está impedindo a criação de roteiros órfãos
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Itinerary = require('../backend/src/models/Itinerary');
const User = require('../backend/src/models/User');

async function testInvalidOwner() {
  console.log('\n🧪 Teste 1: Tentar criar roteiro com owner inexistente');
  
  const fakeOwnerId = new mongoose.Types.ObjectId();
  
  const itinerary = new Itinerary({
    owner: fakeOwnerId,
    title: 'Teste - Deve Falhar',
    destination: {
      city: 'Teste',
      state: 'TS',
      country: 'Brasil',
    },
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'rascunho',
  });
  
  try {
    await itinerary.save();
    console.log('❌ FALHA: Roteiro foi criado com owner inexistente!');
    return false;
  } catch (error) {
    if (error.name === 'ValidationError' && error.message.includes('usuário não existe')) {
      console.log('✅ SUCESSO: Roteiro foi rejeitado corretamente');
      console.log(`   Erro: ${error.message}`);
      return true;
    } else {
      console.log('❌ FALHA: Erro inesperado:', error.message);
      return false;
    }
  }
}

async function testValidOwner() {
  console.log('\n🧪 Teste 2: Criar roteiro com owner válido');
  
  // Buscar um usuário real
  const user = await User.findOne({});
  
  if (!user) {
    console.log('⚠️ Nenhum usuário no banco. Criando usuário de teste...');
    const testUser = new User({
      name: 'Teste Validação',
      email: `test-${Date.now()}@test.com`,
      password: '123456',
      acceptedTerms: true,
    });
    await testUser.save();
    console.log('✅ Usuário de teste criado:', testUser.email);
    return testUser;
  }
  
  const itinerary = new Itinerary({
    owner: user._id,
    title: 'Teste - Deve Funcionar',
    destination: {
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil',
    },
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'rascunho',
  });
  
  try {
    await itinerary.save();
    console.log('✅ SUCESSO: Roteiro criado com owner válido');
    console.log(`   ID: ${itinerary._id}`);
    
    // Limpar roteiro de teste
    await Itinerary.deleteOne({ _id: itinerary._id });
    console.log('🗑️ Roteiro de teste removido');
    
    return true;
  } catch (error) {
    console.log('❌ FALHA: Não foi possível criar roteiro válido');
    console.log(`   Erro: ${error.message}`);
    return false;
  }
}

async function testCascadeDelete() {
  console.log('\n🧪 Teste 3: Cascade delete ao remover usuário');
  
  // Criar usuário de teste
  const testUser = new User({
    name: 'Teste Cascade',
    email: `cascade-test-${Date.now()}@test.com`,
    password: '123456',
    acceptedTerms: true,
  });
  await testUser.save();
  console.log('✅ Usuário de teste criado:', testUser.email);
  
  // Criar roteiro para esse usuário
  const testItinerary = new Itinerary({
    owner: testUser._id,
    title: 'Teste Cascade Delete',
    destination: {
      city: 'Rio de Janeiro',
      state: 'RJ',
      country: 'Brasil',
    },
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'rascunho',
  });
  await testItinerary.save();
  console.log('✅ Roteiro de teste criado:', testItinerary._id);
  
  // Deletar usuário (deve deletar roteiro automaticamente)
  await testUser.deleteOne();
  console.log('🗑️ Usuário removido');
  
  // Verificar se roteiro foi deletado
  const itineraryExists = await Itinerary.exists({ _id: testItinerary._id });
  
  if (itineraryExists) {
    console.log('❌ FALHA: Roteiro não foi deletado automaticamente');
    // Limpar manualmente
    await Itinerary.deleteOne({ _id: testItinerary._id });
    return false;
  } else {
    console.log('✅ SUCESSO: Roteiro foi deletado automaticamente com o usuário');
    return true;
  }
}

async function main() {
  console.log('🧪 Iniciando testes de prevenção de roteiros órfãos...');
  
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado ao MongoDB');
    
    const results = [];
    
    // Teste 1: Owner inexistente
    results.push(await testInvalidOwner());
    
    // Teste 2: Owner válido
    results.push(await testValidOwner());
    
    // Teste 3: Cascade delete
    results.push(await testCascadeDelete());
    
    // Resumo
    console.log('\n📊 RESUMO DOS TESTES:');
    console.log('==========================================');
    const passed = results.filter(r => r === true).length;
    const total = results.length;
    console.log(`   ✅ Aprovados: ${passed}/${total}`);
    console.log(`   ❌ Falharam: ${total - passed}/${total}`);
    console.log('==========================================');
    
    if (passed === total) {
      console.log('\n🎉 Todos os testes passaram!');
      console.log('   Os mecanismos de prevenção estão funcionando corretamente.');
    } else {
      console.log('\n⚠️ Alguns testes falharam. Verifique os logs acima.');
    }
    
  } catch (error) {
    console.error('❌ Erro durante testes:', error);
    process.exit(1);
  } finally {
    // Cleanup: deletar usuários de teste criados durante o teste
    try {
      console.log('\n🧹 Limpando dados de teste...');
      const deletedUsers = await User.deleteMany({ 
        email: { $regex: /cascade-test.*@test\.com/i }
      });
      const deletedItineraries = await Itinerary.deleteMany({
        title: { $regex: /teste cascade delete/i }
      });
      console.log(`   ✅ ${deletedUsers.deletedCount} usuários de teste removidos`);
      console.log(`   ✅ ${deletedItineraries.deletedCount} roteiros de teste removidos`);
    } catch (cleanupError) {
      console.error('⚠️ Erro ao limpar dados de teste:', cleanupError.message);
    }
    
    await mongoose.connection.close();
    console.log('\n🔌 Conexão fechada');
  }
}

main();
