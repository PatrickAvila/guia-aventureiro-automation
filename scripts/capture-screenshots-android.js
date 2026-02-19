#!/usr/bin/env node

/**
 * Script para capturar screenshots automaticamente no emulador Android
 * 
 * Requisitos:
 * - Emulador Android rodando
 * - App Guia do Aventureiro instalado e aberto
 * - ADB instalado e configurado
 * 
 * Uso: node scripts/capture-screenshots-android.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

// Configurações
const CONFIG = {
  outputDir: path.join(__dirname, '..', 'screenshots'),
  deviceName: null,
  packageName: 'host.exp.exponent',
  delay: 3000,
  cleanup: true,
};

const SCREENSHOTS = [
  { name: '01-onboarding', description: 'Tela de Onboarding/Boas-vindas', delay: 2000 },
  { name: '02-dashboard', description: 'Dashboard com roteiros', delay: 3000 },
  { name: '03-generate', description: 'Geração de roteiro com IA', delay: 2000 },
  { name: '04-itinerary-detail', description: 'Detalhe do roteiro gerado', delay: 3000 },
  { name: '05-photos', description: 'Galeria de fotos', delay: 2000 },
  { name: '06-explore', description: 'Explorar roteiros públicos', delay: 3000 },
  { name: '07-profile', description: 'Perfil com conquistas', delay: 2000 },
];

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, total, message) {
  log(`\n[${step}/${total}] ${message}`, 'blue');
}

// Verificar se ADB está disponível
async function checkADB() {
  try {
    await execPromise('adb version');
    log('✓ ADB encontrado', 'green');
    return true;
  } catch (error) {
    log('✗ ADB não encontrado. Instale o Android SDK.', 'red');
    log('  Download: https://developer.android.com/studio', 'yellow');
    return false;
  }
}

// Detectar dispositivo conectado
async function detectDevice() {
  try {
    const { stdout } = await execPromise('adb devices');
    const lines = stdout.split('\n').filter(line => line.includes('\t'));
    
    if (lines.length === 0) {
      log('✗ Nenhum dispositivo/emulador encontrado', 'red');
      log('  Inicie o emulador primeiro: npm run emulator:android', 'yellow');
      return null;
    }
    
    const deviceId = lines[0].split('\t')[0];
    CONFIG.deviceName = deviceId;
    log(`✓ Dispositivo encontrado: ${deviceId}`, 'green');
    return deviceId;
  } catch (error) {
    log(`✗ Erro ao detectar dispositivo: ${error.message}`, 'red');
    return null;
  }
}

// Verificar se app está rodando
async function checkAppRunning() {
  try {
    const { stdout } = await execPromise(
      `adb -s ${CONFIG.deviceName} shell "dumpsys window | grep mCurrentFocus"`
    );
    
    if (stdout.includes(CONFIG.packageName)) {
      log('✓ App está rodando', 'green');
      return true;
    } else {
      log('✗ App não está rodando', 'red');
      log(`  Abra o app Expo Go e carregue o projeto`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`⚠ Não foi possível verificar se app está rodando`, 'yellow');
    return true; // Continuar mesmo assim
  }
}

// Criar diretório de saída
function ensureOutputDir() {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  log(`✓ Diretório de saída: ${CONFIG.outputDir}`, 'green');
}

// Aguardar um tempo
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Capturar screenshot
async function captureScreenshot(screenshot, index, total) {
  logStep(index + 1, total, screenshot.description);
  
  // Instruções para o usuário
  log(`  ${screenshot.instructions}`, 'yellow');
  log(`  Aguarde ${screenshot.delay}ms...`, 'yellow');
  
  // Aguardar delay
  await wait(screenshot.delay);
  
  // Nome do arquivo no dispositivo
  const devicePath = `/sdcard/${screenshot.name}.png`;
  const localPath = path.join(CONFIG.outputDir, `${screenshot.name}.png`);
  
  try {
    // Capturar screenshot
    log(`  Capturando screenshot...`);
    await execPromise(`adb -s ${CONFIG.deviceName} shell screencap -p ${devicePath}`);
    
    // Transferir para PC
    log(`  Transferindo para PC...`);
    await execPromise(`adb -s ${CONFIG.deviceName} pull ${devicePath} "${localPath}"`);
    
    // Limpar do dispositivo
    if (CONFIG.cleanup) {
      await execPromise(`adb -s ${CONFIG.deviceName} shell rm ${devicePath}`);
    }
    
    log(`  ✓ Salvo: ${screenshot.name}.png`, 'green');
    
    // Aguardar antes do próximo
    await wait(CONFIG.delay);
    
    return true;
  } catch (error) {
    log(`  ✗ Erro ao capturar: ${error.message}`, 'red');
    return false;
  }
}

// Executar captura interativa
async function captureInteractive() {
  log('\n═══════════════════════════════════════════════════', 'bright');
  log('  📸 MODO INTERATIVO - Captura de Screenshots', 'bright');
  log('═══════════════════════════════════════════════════\n', 'bright');
  
  log('Como funciona:', 'yellow');
  log('1. Para cada screenshot, você verá as instruções');
  log('2. Navegue manualmente no app para a tela indicada');
  log('3. O script aguardará e capturará automaticamente');
  log('4. Pressione Ctrl+C para cancelar a qualquer momento\n');
  
  log('Pressione ENTER para começar...');
  
  // Aguardar input do usuário
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
  
  let successCount = 0;
  
  for (let i = 0; i < SCREENSHOTS.length; i++) {
    const success = await captureScreenshot(SCREENSHOTS[i], i, SCREENSHOTS.length);
    if (success) successCount++;
  }
  
  // Resumo
  log('\n═══════════════════════════════════════════════════', 'bright');
  log(`  ✓ Captura concluída: ${successCount}/${SCREENSHOTS.length} screenshots`, 'green');
  log('═══════════════════════════════════════════════════\n', 'bright');
  
  if (successCount < SCREENSHOTS.length) {
    log(`⚠ Alguns screenshots falharam. Verifique os logs acima.`, 'yellow');
  }
}

// Executar captura automática (sem interação)
async function captureAutomatic() {
  log('\n⚠ MODO AUTOMÁTICO ainda não implementado', 'yellow');
  log('Use o modo interativo por enquanto.\n');
  process.exit(1);
}

// Função principal
async function main() {
  log('\n🤖 Captura Automática de Screenshots - Android\n', 'bright');
  
  // Verificações
  if (!await checkADB()) {
    process.exit(1);
  }
  
  if (!await detectDevice()) {
    process.exit(1);
  }
  
  if (!await checkAppRunning()) {
    process.exit(1);
  }
  
  ensureOutputDir();
  
  // Modo interativo por padrão
  await captureInteractive();
  
  log('✓ Processo finalizado!\n', 'green');
  process.exit(0);
}

// Executar
if (require.main === module) {
  main().catch(error => {
    log(`\n✗ Erro fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { captureScreenshot, SCREENSHOTS };
