module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/*.test.js'],
  testTimeout: 30000,
  maxWorkers: 1, // Rodar testes em série para evitar problemas de concorrência
  forceExit: true, // Forçar saída após testes
};
