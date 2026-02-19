#!/usr/bin/env node
// automation/scripts/verifyCleanup.js
// Verifica se há dados de teste no banco de dados

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });
const mongoose = require('mongoose');

// Fechar qualquer conexão existente antes de importar models
if (mongoose.connection.readyState !== 0) {
  mongoose.connection.close();
}

// Importar models do backend
const User = require('../../backend/src/models/User');
const Itinerary = require('../../backend/src/models/Itinerary');

async function verifyCleanup() {
  try {
    console.log('🔍 Conectando ao MongoDB...\n');
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000
    });
    console.log('✅ Conectado ao MongoDB\n');
    
    // Contar usuários de teste
    const testUsers = await User.countDocuments({ 
      email: { $regex: /@test\.com$|@example\.com$/i } 
    });
    
    // Contar roteiros de teste
    const testItineraries = await Itinerary.countDocuments({ 
      title: { $regex: /test|teste|budget test|viagem/i } 
    });
    
    // Buscar alguns exemplos
    const sampleUsers = await User.find({ 
      email: { $regex: /@test\.com$|@example\.com$/i } 
    }).limit(5).select('name email createdAt');
    
    const sampleItineraries = await Itinerary.find({ 
      title: { $regex: /test|teste/i } 
    }).limit(5).select('title createdAt');
    
    console.log('📊 ESTATÍSTICAS DO BANCO DE DADOS\n');
    console.log(`👥 Usuários de teste: ${testUsers}`);
    console.log(`📝 Roteiros de teste: ${testItineraries}\n`);
    
    if (testUsers === 0 && testItineraries === 0) {
      console.log('✅ BANCO LIMPO - Nenhum dado de teste encontrado!\n');
    } else {
      console.log('⚠️  ATENÇÃO: Dados de teste encontrados no banco!\n');
      
      if (sampleUsers.length > 0) {
        console.log('Exemplos de usuários de teste:');
        sampleUsers.forEach(u => {
          console.log(`  - ${u.name} (${u.email}) - Criado em ${u.createdAt}`);
        });
        console.log('');
      }
      
      if (sampleItineraries.length > 0) {
        console.log('Exemplos de roteiros de teste:');
        sampleItineraries.forEach(i => {
          console.log(`  - ${i.title} - Criado em ${i.createdAt}`);
        });
        console.log('');
      }
      
      console.log('💡 Para limpar, execute: npm run test:force-clean\n');
    }
    
    await mongoose.connection.close();
    process.exit(testUsers + testItineraries > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

verifyCleanup();
