#!/usr/bin/env node
// automation/scripts/forceCleanup.js
// Força limpeza de todos os dados de teste

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });
const mongoose = require('mongoose');

// Importar models do backend
const User = require('../../backend/src/models/User');
const Itinerary = require('../../backend/src/models/Itinerary');

async function getDatabaseStats() {
  const userCount = await User.countDocuments({ 
    email: { $regex: /@test\.com$|@example\.com$/i } 
  });
  const itineraryCount = await Itinerary.countDocuments({ 
    title: { $regex: /test|teste|viagem|budget/i } 
  });
  
  return {
    testUsers: userCount,
    testItineraries: itineraryCount
  };
}

async function cleanupTestData() {
  // Limpar usuários de teste
  const userResult = await User.deleteMany({
    email: { $regex: /@test\.com$|@example\.com$/i }
  });

  // Limpar roteiros de teste
  const itineraryResult = await Itinerary.deleteMany({
    title: { $regex: /test|teste|viagem|budget/i }
  });

  return {
    users: userResult.deletedCount,
    itineraries: itineraryResult.deletedCount
  };
}

async function forceCleanup() {
  try {
    console.log('🧹 LIMPEZA FORÇADA DE DADOS DE TESTE\n');
    console.log('⚠️  Isso removerá TODOS os dados de teste do banco!\n');
    
    await mongoose.connect(process.env.MONGO_URI);
    
    // Mostrar estatísticas antes
    const before = await getDatabaseStats();
    console.log('📊 ANTES DA LIMPEZA:');
    console.log(`   👥 Usuários de teste: ${before.testUsers}`);
    console.log(`   📝 Roteiros de teste: ${before.testItineraries}\n`);
    
    if (before.testUsers === 0 && before.testItineraries === 0) {
      console.log('✅ Banco já está limpo!\n');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    // Executar limpeza
    console.log('🗑️  Executando limpeza...\n');
    const result = await cleanupTestData();
    
    console.log(`🗑️  Limpeza: ${result.users} usuários, ${result.itineraries} roteiros removidos\n`);
    
    // Mostrar estatísticas depois
    const after = await getDatabaseStats();
    console.log('📊 DEPOIS DA LIMPEZA:');
    console.log(`   👥 Usuários de teste: ${after.testUsers}`);
    console.log(`   📝 Roteiros de teste: ${after.testItineraries}\n`);
    
    if (after.testUsers === 0 && after.testItineraries === 0) {
      console.log('✅ Limpeza concluída com sucesso!\n');
    } else {
      console.log('⚠️  Alguns dados ainda permanecem no banco.\n');
      console.log('💡 Verifique padrões de nomenclatura e tente novamente.\n');
    }
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

forceCleanup();
