// automation/cancel-subscription.js
/**
 * Script para cancelar assinatura Stripe (teste)
 * 
 * USO:
 *   node automation/cancel-subscription.js --email patrick@email.com [--immediately]
 * 
 * O QUE FAZ:
 *   1. Busca usuário e subscription
 *   2. Cancela assinatura no Stripe
 *   3. Faz downgrade para FREE (se --immediately)
 *   4. Verifica limites atualizados
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const mongoose = require('mongoose');
const { connectDB, closeDB } = require('./helpers/database');
const User = require('../backend/src/models/User');
const Subscription = require('../backend/src/models/Subscription');
const stripe = require('../backend/src/config/stripe');
const stripeService = require('../backend/src/services/stripeService');

async function cancelSubscription(email, immediately = false) {
  try {
    console.log('🔴 CANCELAR ASSINATURA STRIPE\n');
    console.log('===============================\n');

    await connectDB();

    // 1. Buscar usuário
    console.log(`1️⃣  Buscando usuário: ${email}...`);
    const user = await User.findOne({ email });
    if (!user) {
      console.error('❌ Usuário não encontrado');
      process.exit(1);
    }
    console.log(`✅ Usuário encontrado: ${user.name} (${user._id})\n`);

    // 2. Buscar subscription
    console.log('2️⃣  Verificando subscription...');
    const subscription = await Subscription.findOne({ user: user._id });
    if (!subscription) {
      console.error('❌ Subscription não encontrada');
      process.exit(1);
    }

    console.log(`   Plano atual: ${subscription.plan.toUpperCase()}`);
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Payment Status: ${subscription.paymentStatus}`);
    console.log(`   Stripe Subscription ID: ${subscription.stripeSubscriptionId || 'N/A'}\n`);

    if (!subscription.stripeSubscriptionId) {
      console.log('⚠️  Nenhuma assinatura Stripe ativa encontrada.');
      console.log('   Fazendo downgrade manual para FREE...\n');
      
      await stripeService.downgradeUserToFree(user._id, 'Cancelamento manual via script');
      
      console.log('✅ Downgrade manual concluído!\n');
      process.exit(0);
    }

    // 3. Cancelar no Stripe
    console.log(`3️⃣  Cancelando assinatura Stripe (immediately: ${immediately})...`);
    
    const canceledSubscription = await stripeService.cancelSubscription(
      subscription.stripeSubscriptionId,
      immediately
    );

    if (immediately) {
      console.log('   ✅ Assinatura cancelada IMEDIATAMENTE no Stripe');
      
      // 4. Fazer downgrade
      console.log('\n4️⃣  Fazendo downgrade para FREE...');
      await stripeService.downgradeUserToFree(user._id, 'Cancelamento imediato via script');
    } else {
      console.log('   ✅ Assinatura marcada para cancelar ao fim do período');
      console.log(`   Ativa até: ${new Date(canceledSubscription.current_period_end * 1000).toLocaleDateString()}`);
    }

    // 5. Verificar status final
    console.log('\n5️⃣  Verificando status final...');
    const updatedSubscription = await Subscription.findOne({ user: user._id });

    console.log('\n📊 STATUS ATUALIZADO:\n');
    console.log(`   Plano: ${updatedSubscription.plan.toUpperCase()}`);
    console.log(`   Status: ${updatedSubscription.status}`);
    console.log(`   Payment Status: ${updatedSubscription.paymentStatus}`);
    console.log(`   Cancelado em: ${updatedSubscription.cancelledAt || 'N/A'}`);
    console.log('\n📈 LIMITES:');
    console.log(`   Slots: ${updatedSubscription.usage.itineraries.current}/${updatedSubscription.usage.itineraries.limit}`);
    console.log(`   Criações mensais: ${updatedSubscription.usage.aiGenerations.current}/${updatedSubscription.usage.aiGenerations.limit}`);

    console.log('\n✅ CANCELAMENTO CONCLUÍDO!\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error.stack);
  } finally {
    await closeDB();
  }
}

// Executar
const args = process.argv.slice(2);
const emailIndex = args.indexOf('--email');
const immediately = args.includes('--immediately');

if (emailIndex === -1 || !args[emailIndex + 1]) {
  console.log('❌ Email não fornecido\n');
  console.log('Uso: node automation/cancel-subscription.js --email <email> [--immediately]\n');
  console.log('Exemplos:');
  console.log('  node automation/cancel-subscription.js --email patrick@email.com');
  console.log('  node automation/cancel-subscription.js --email patrick@email.com --immediately');
  process.exit(1);
}

const email = args[emailIndex + 1];
cancelSubscription(email, immediately);
