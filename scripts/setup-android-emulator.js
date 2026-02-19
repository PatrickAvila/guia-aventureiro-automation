/**
 * Script para configurar emulador Android
 * 
 * Pré-requisitos:
 * - Android Studio instalado
 * - Android SDK configurado
 * - Variável ANDROID_HOME definida
 * 
 * Este script:
 * 1. Verifica se AVD Manager está disponível
 * 2. Lista emuladores existentes
 * 3. Cria um emulador caso não exista
 * 4. Inicia o emulador
 */

const { execSync } = require('child_process');

console.log('\n🤖 Setup do Emulador Android\n');

const AVD_NAME = 'Pixel_5_API_33';
const DEVICE_TYPE = 'pixel_5';
const SYSTEM_IMAGE = 'system-images;android-33;google_apis;x86_64';

function checkAndroidHome() {
  console.log('Verificando ANDROID_HOME...');
  
  if (!process.env.ANDROID_HOME) {
    console.log('❌ ANDROID_HOME não está definido');
    console.log('\nDefina a variável de ambiente:');
    console.log('Windows: setx ANDROID_HOME "C:\\Users\\SEU_USUARIO\\AppData\\Local\\Android\\Sdk"');
    console.log('Linux/Mac: export ANDROID_HOME=$HOME/Android/Sdk');
    process.exit(1);
  }
  
  console.log(`✓ ANDROID_HOME: ${process.env.ANDROID_HOME}`);
}

function checkAvdManager() {
  console.log('\nVerificando AVD Manager...');
  
  try {
    const avdmanager = process.platform === 'win32' ? 'avdmanager.bat' : 'avdmanager';
    execSync(`${avdmanager} list avd`, { stdio: 'ignore' });
    console.log('✓ AVD Manager disponível');
    return true;
  } catch (error) {
    console.log('❌ AVD Manager não encontrado');
    console.log('\nInstale via Android Studio:');
    console.log('Tools > SDK Manager > SDK Tools > Android SDK Command-line Tools');
    return false;
  }
}

function listAvds() {
  console.log('\nEmuladores disponíveis:');
  
  try {
    const avdmanager = process.platform === 'win32' ? 'avdmanager.bat' : 'avdmanager';
    const output = execSync(`${avdmanager} list avd`, { encoding: 'utf-8' });
    
    if (output.includes('Available Android Virtual Devices')) {
      console.log(output);
    } else {
      console.log('Nenhum emulador encontrado');
    }
    
    return output.includes(AVD_NAME);
  } catch (error) {
    console.log('Erro ao listar emuladores');
    return false;
  }
}

function downloadSystemImage() {
  console.log(`\nBaixando system image ${SYSTEM_IMAGE}...`);
  
  try {
    const sdkmanager = process.platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager';
    execSync(`echo y | ${sdkmanager} "${SYSTEM_IMAGE}"`, { stdio: 'inherit' });
    console.log('✓ System image baixado');
    return true;
  } catch (error) {
    console.log('❌ Erro ao baixar system image');
    return false;
  }
}

function createAvd() {
  console.log(`\nCriando emulador ${AVD_NAME}...`);
  
  try {
    const avdmanager = process.platform === 'win32' ? 'avdmanager.bat' : 'avdmanager';
    execSync(
      `echo no | ${avdmanager} create avd -n ${AVD_NAME} -k "${SYSTEM_IMAGE}" -d ${DEVICE_TYPE}`,
      { stdio: 'inherit' }
    );
    
    console.log(`✓ Emulador ${AVD_NAME} criado`);
    return true;
  } catch (error) {
    console.log('❌ Erro ao criar emulador');
    return false;
  }
}

function startEmulator() {
  console.log(`\nIniciando emulador ${AVD_NAME}...`);
  console.log('(Isso pode levar alguns minutos na primeira vez)');
  
  try {
    const emulator = process.platform === 'win32' ? 'emulator.exe' : 'emulator';
    const { spawn } = require('child_process');
    const child = spawn(emulator, [`@${AVD_NAME}`, '-no-snapshot-load'], {
      detached: true,
      stdio: 'ignore'
    });
    
    child.unref();
    
    console.log('\n✓ Emulador iniciado em background');
    console.log('\nAguarde ~30s para o emulador ficar pronto');
    console.log('Verifique o status: adb devices');
  } catch (error) {
    console.log('❌ Erro ao iniciar emulador');
    console.log('\nTente manualmente:');
    console.log(`emulator @${AVD_NAME}`);
  }
}

async function main() {
  checkAndroidHome();
  
  if (!checkAvdManager()) {
    process.exit(1);
  }
  
  const avdExists = listAvds();
  
  if (!avdExists) {
    console.log(`\nEmulador ${AVD_NAME} não existe. Criando...`);
    
    if (!downloadSystemImage()) {
      process.exit(1);
    }
    
    if (!createAvd()) {
      process.exit(1);
    }
  } else {
    console.log(`\n✓ Emulador ${AVD_NAME} já existe`);
  }
  
  startEmulator();
  console.log('\n✅ Setup concluído!\n');
}

main().catch(error => {
  console.error('\n❌ Erro:', error.message);
  process.exit(1);
});
