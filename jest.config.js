module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/*.test.js'],
  testTimeout: 30000,
  maxWorkers: 1, // Rodar testes em série para evitar problemas de concorrência
  forceExit: true, // Forçar saída após testes
  
  // 📊 Coverage reports
  collectCoverage: process.env.COVERAGE === 'true' || false,
  collectCoverageFrom: [
    'tests/**/*.test.js',
    '!tests/setup.js',
    '!tests/helpers/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'json', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 60,
      lines: 65,
      statements: 65,
    }
  },
  
  // 📝 Reporters melhorados
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage/reports',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: '/',
      usePathAsClassName: true,
    }]
  ],
  
  // 🎯 Verbose output
  verbose: process.env.VERBOSE === 'true' || false,
};
