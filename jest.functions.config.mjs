/** @type {import('jest').Config} */
export default {
  // Use node environment for Firebase Functions
  testEnvironment: 'node',

  // Inject globals automatically (no need to import from '@jest/globals')
  injectGlobals: true,

  // Enable ES modules (functions/package.json has "type": "module")
  transform: {},

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.functions.setup.js'],

  // Only test functions directory
  testMatch: [
    '**/__tests__/functions/**/*.test.js',
    '**/__tests__/integration/**/*.test.js',
  ],

  // Ignore frontend tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/components/',
    '/__tests__/utils/',
    '/__tests__/setup/',
  ],

  // Coverage for functions
  collectCoverageFrom: [
    'functions/**/*.js',
    '!functions/index.js', // Mostly boilerplate
    '!functions/node_modules/**',
  ],
  coverageDirectory: 'coverage-functions',
  coverageReporters: ['text', 'lcov', 'html'],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Longer timeout for integration tests
  testTimeout: 30000,
}
