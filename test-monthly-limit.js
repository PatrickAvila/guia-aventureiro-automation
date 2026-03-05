// Script para testar o limite mensal de criações
require('dotenv').config();
const mongoose = require('mongoose');
const Subscription = require('../backend/src/models/Subscription');
const Itinerary = require('../backend/src/models/Itinerary');
const User = require('../backend/src/models/User');

async function testMonthlyLimit() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado ao MongoDB\n');

    // Buscar primeiro usuário FREE
    const subscription = await Subscription.findOne({ plan: 'free' }).populate('user');
    
    if (!subscription) {
      console.log('❌ Nenhuma subscription FREE encontrada');
      process.exit(1);
    }

    console.log(`📊 Testando com usuário: ${subscription.user?.email || subscription.user}`);
    console.log(`📦 Plano: ${subscription.plan.toUpperCase()}`);
    console.log(`\n📈 ANTES DO TESTE:`);
    console.log(`   Roteiros ativos: ${subscription.usage.itineraries.current}/${subscription.usage.itineraries.limit}`);
    console.log(`   Criações mensais: ${subscription.usage.monthlyCreations.count}/${subscription.usage.monthlyCreations.limit}`);
    console.log(`   Último reset: ${subscription.usage.monthlyCreations.lastReset.toLocaleDateString('pt-BR')}`);

    // Teste 1: Criar 3 roteiros
    console.log('\n\n🧪 TESTE 1: Criar 3 roteiros');
    for (let i = 1; i <= 3; i++) {
      const canCreate = subscription.canCreateItinerary();
      console.log(`\n   Tentativa ${i}:`);
      console.log(`   - canCreateItinerary(): ${canCreate}`);
      
      if (canCreate) {
        const itinerary = new Itinerary({
          owner: subscription.user._id,
          title: `Roteiro Teste ${i}`,
          destination: { city: 'São Paulo', country: 'Brasil' },
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          duration: 1,
          days: [],
        });
        await itinerary.save();
        
        subscription.incrementUsage('itineraries');
        subscription.incrementUsage('monthlyCreations');
        await subscription.save();
        
        console.log(`   ✅ Criado: ${itinerary.title}`);
        console.log(`   📊 Ativos: ${subscription.usage.itineraries.current}/${subscription.usage.itineraries.limit}`);
        console.log(`   📅 Mensais: ${subscription.usage.monthlyCreations.count}/${subscription.usage.monthlyCreations.limit}`);
      } else {
        console.log(`   ❌ BLOQUEADO!`);
      }
    }

    // Teste 2: Deletar 1 roteiro
    console.log('\n\n🧪 TESTE 2: Deletar 1 roteiro');
    const firstItinerary = await Itinerary.findOne({ owner: subscription.user._id });
    if (firstItinerary) {
      console.log(`   🗑️ Deletando: ${firstItinerary.title}`);
      await Itinerary.deleteOne({ _id: firstItinerary._id });
      
      subscription.decrementUsage('itineraries');
      await subscription.save();
      
      console.log(`   ✅ Deletado!`);
      console.log(`   📊 Ativos: ${subscription.usage.itineraries.current}/${subscription.usage.itineraries.limit}`);
      console.log(`   📅 Mensais: ${subscription.usage.monthlyCreations.count}/${subscription.usage.monthlyCreations.limit} (NÃO decrementou)`);
    }

    // Teste 3: Criar mais 7 para atingir 10 mensais (deletando quando bater 3 slots)
    console.log('\n\n🧪 TESTE 3: Criar mais 7 roteiros (deletando quando bater 3 slots)');
    for (let i = 4; i <= 10; i++) {
      // Se tiver 3 slots ativos, deletar 2 para liberar espaço
      if (subscription.usage.itineraries.current >= 3) {
        const toDelete = await Itinerary.find({ owner: subscription.user._id }).limit(2);
        for (const it of toDelete) {
          await Itinerary.deleteOne({ _id: it._id });
          subscription.decrementUsage('itineraries');
        }
        await subscription.save();
        console.log(`   🗑️ Deletados 2 roteiros para liberar slots (${subscription.usage.itineraries.current}/3 ativos)`);
      }
      
      const canCreate = subscription.canCreateItinerary();
      
      if (canCreate) {
        const itinerary = new Itinerary({
          owner: subscription.user._id,
          title: `Roteiro Teste ${i}`,
          destination: { city: 'Rio de Janeiro', country: 'Brasil' },
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          duration: 1,
          days: [],
        });
        await itinerary.save();
        
        subscription.incrementUsage('itineraries');
        subscription.incrementUsage('monthlyCreations');
        await subscription.save();
        
        console.log(`   ${i}. ✅ Criado | Ativos: ${subscription.usage.itineraries.current}/3 | Mensais: ${subscription.usage.monthlyCreations.count}/10`);
      } else {
        console.log(`   ${i}. ❌ BLOQUEADO | Ativos: ${subscription.usage.itineraries.current}/3 | Mensais: ${subscription.usage.monthlyCreations.count}/10`);
        break;
      }
    }

    // Teste 4: Tentar criar o 11º (deve falhar)
    console.log('\n\n🧪 TESTE 4: Tentar criar 11º roteiro (deve BLOQUEAR)');
    const canCreateEleven = subscription.canCreateItinerary();
    console.log(`   canCreateItinerary(): ${canCreateEleven}`);
    console.log(`   📊 Ativos: ${subscription.usage.itineraries.current}/${subscription.usage.itineraries.limit}`);
    console.log(`   📅 Mensais: ${subscription.usage.monthlyCreations.count}/${subscription.usage.monthlyCreations.limit}`);
    
    if (!canCreateEleven) {
      console.log(`   ✅ CORRETO: Sistema bloqueou criação após 10 criações mensais!`);
    } else {
      console.log(`   ❌ ERRO: Sistema deveria ter bloqueado!`);
    }

    // Teste 5: Deletar todos os roteiros
    console.log('\n\n🧪 TESTE 5: Deletar todos os roteiros ativos');
    const allItineraries = await Itinerary.find({ owner: subscription.user._id });
    for (const it of allItineraries) {
      await Itinerary.deleteOne({ _id: it._id });
      subscription.decrementUsage('itineraries');
    }
    await subscription.save();
    console.log(`   🗑️ Deletados ${allItineraries.length} roteiros`);
    console.log(`   📊 Ativos agora: ${subscription.usage.itineraries.current}/${subscription.usage.itineraries.limit}`);
    console.log(`   📅 Mensais ainda: ${subscription.usage.monthlyCreations.count}/${subscription.usage.monthlyCreations.limit}`);

    // Teste 6: Tentar criar de novo após atingir limite mensal
    console.log('\n\n🧪 TESTE 6: Tentar criar com 0 ativos mas limite mensal atingido');
    const canCreateAfterDelete = subscription.canCreateItinerary();
    console.log(`   canCreateItinerary(): ${canCreateAfterDelete}`);
    console.log(`   📊 Slots: ${subscription.usage.itineraries.current}/3 (tem espaço)`);
    console.log(`   📅 Mensais: ${subscription.usage.monthlyCreations.count}/10`);
    
    if (subscription.usage.monthlyCreations.count >= 10) {
      if (!canCreateAfterDelete) {
        console.log(`   ✅ ANTI-ABUSE FUNCIONANDO! Bloqueou mesmo com 0/3 slots`);
        console.log(`   🛡️ Usuário não pode burlar criando/deletando infinitamente!`);
      } else {
        console.log(`   ❌ FALHA: Sistema permitiu criar apesar de 10/10 mensais`);
      }
    } else {
      if (canCreateAfterDelete) {
        console.log(`   ✅ CORRETO: Ainda não atingiu limite mensal, pode criar`);
        console.log(`   📊 Pode criar mais ${10 - subscription.usage.monthlyCreations.count} roteiros este mês`);
      } else {
        console.log(`   ❌ FALHA: Bloqueou sem motivo (tem slots e não atingiu limite mensal)`);
      }
    }

    console.log('\n\n📊 RESUMO FINAL:');
    console.log(`   Roteiros ativos: ${subscription.usage.itineraries.current}/${subscription.usage.itineraries.limit}`);
    console.log(`   Criações mensais: ${subscription.usage.monthlyCreations.count}/${subscription.usage.monthlyCreations.limit}`);
    console.log(`   Reset em: 1º de ${new Date(subscription.usage.monthlyCreations.lastReset).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`);
    
    console.log('\n✅ Teste completo!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

testMonthlyLimit();
