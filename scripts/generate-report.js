#!/usr/bin/env node
/**
 * Test Report Generator - Gera relatório detalhado dos testes
 * Útil para CI/CD e monitoramento de qualidade
 */

const fs = require('fs');
const path = require('path');

const TEST_DIR = path.join(__dirname, 'tests');
const COVERAGE_DIR = path.join(__dirname, 'coverage');

function analyzeTestFiles() {
  const testFiles = fs.readdirSync(TEST_DIR)
    .filter(f => f.endsWith('.test.js') && !f.endsWith('.skip'))
    .sort();

  const stats = {
    totalFiles: testFiles.length,
    totalTests: 0,
    files: [],
  };

  testFiles.forEach(file => {
    const filePath = path.join(TEST_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Contar testes
    const testMatches = content.match(/test\(|it\(/g) || [];
    const describeMatches = content.match(/describe\(/g) || [];
    const skipMatches = content.match(/test\.skip|it\.skip/g) || [];

    const fileStats = {
      name: file,
      tests: testMatches.length,
      suites: describeMatches.length,
      skipped: skipMatches.length,
      active: testMatches.length - skipMatches.length,
    };

    stats.files.push(fileStats);
    stats.totalTests += testMatches.length;
  });

  return stats;
}

function getCoverageStats() {
  const coverageSummary = path.join(COVERAGE_DIR, 'coverage-summary.json');

  if (!fs.existsSync(coverageSummary)) {
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(coverageSummary, 'utf8'));
    return data.total;
  } catch (error) {
    return null;
  }
}

function generateReport() {
  console.clear();
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                   📊 TEST REPORT                           ║');
  console.log('║            Guia do Aventureiro - Automation Suite           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  const stats = analyzeTestFiles();

  // Resumo
  console.log('📈 RESUMO GERAL');
  console.log('─'.repeat(60));
  console.log(`  Arquivos de teste: ${stats.totalFiles}`);
  console.log(`  Total de testes: ${stats.totalTests}`);
  console.log(`  Testes ativos: ${stats.files.reduce((sum, f) => sum + f.active, 0)}`);
  console.log(`  Testes skipped: ${stats.files.reduce((sum, f) => sum + f.skipped, 0)}`);
  console.log('');

  // Detalhes por arquivo
  console.log('📋 DETALHE POR ARQUIVO');
  console.log('─'.repeat(60));
  console.log('  arquivo                          testes  suites  ativos  skip');
  console.log('─'.repeat(60));

  stats.files.forEach(file => {
    const nameDisplay = file.name.padEnd(32);
    const testsDisplay = String(file.tests).padStart(7);
    const suitesDisplay = String(file.suites).padStart(7);
    const activeDisplay = String(file.active).padStart(7);
    const skippedDisplay = String(file.skipped).padStart(4);

    let statusIcon = '✅';
    if (file.skipped > 0) statusIcon = '⏭️';

    console.log(`  ${statusIcon} ${nameDisplay}${testsDisplay}${suitesDisplay}${activeDisplay}${skippedDisplay}`);
  });

  // Coverage
  const coverage = getCoverageStats();
  if (coverage) {
    console.log('\n');
    console.log('📊 COBERTURA DE CÓDIGO');
    console.log('─'.repeat(60));

    const metrics = [
      { name: 'Linhas', key: 'lines' },
      { name: 'Funções', key: 'functions' },
      { name: 'Branches', key: 'branches' },
      { name: 'Statements', key: 'statements' },
    ];

    metrics.forEach(metric => {
      const covered = coverage[metric.key].covered || 0;
      const total = coverage[metric.key].total || 0;
      const percentage = total > 0 ? ((covered / total) * 100).toFixed(1) : 0;

      const barLength = 30;
      const filledLength = Math.round((percentage / 100) * barLength);
      const emptyLength = barLength - filledLength;
      const bar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);

      let statusIcon = '✅';
      if (percentage < 50) statusIcon = '⚠️';
      if (percentage < 30) statusIcon = '❌';

      console.log(`  ${statusIcon} ${metric.name.padEnd(12)} ${bar} ${percentage}%`);
    });
  }

  // Recomendações
  console.log('\n');
  console.log('💡 RECOMENDAÇÕES');
  console.log('─'.repeat(60));

  const skippedCount = stats.files.reduce((sum, f) => sum + f.skipped, 0);
  if (skippedCount > 0) {
    console.log(`  • ${skippedCount} testes skipped - considere implementar funcionalidades`);
  }

  if (coverage && coverage.lines.pct < 65) {
    console.log('  • Coverage < 65% - adicione mais testes para criar cobertura');
  }

  if (stats.totalFiles > 16) {
    console.log('  • Muitos arquivos de teste - considere consolidar suites relacionadas');
  }

  // Comandos úteis
  console.log('\n');
  console.log('🚀 COMANDOS ÚTEIS');
  console.log('─'.repeat(60));
  console.log('  npm test                    → Executar todos os testes');
  console.log('  npm run test:watch          → Modo watch (desenvolvimento)');
  console.log('  npm run test:coverage       → Gerar relatório de coverage');
  console.log('  npm run test:ci             → Executar com retry (CI/CD)');
  console.log('  npm run test:debug          → Modo verbose com detalhes');
  console.log('  npm run test:quick          → Testes rápidos (sem analytics/offline)');
  console.log('');
  console.log('  npm test -- auth.test.js    → Executar arquivo específico');
  console.log('  npm test -- --testNamePattern="login"');
  console.log('                              → Executar testes contendo "login"');
  console.log('');

  console.log('📚 DOCUMENTAÇÃO');
  console.log('─'.repeat(60));
  console.log('  • Boas Práticas: TESTING_BEST_PRACTICES.md');
  console.log('  • Status Completo: README_TESTS.md');
  console.log('  • Help Completo: node help.js');
  console.log('\n');
}

// Executar
generateReport();
