/** @type {import('jest').Config} */
export default {
  // Use node environment for Firebase Functions
  testEnvironment: 'node',

  // Inject globals automatically (no need to import from '@jest/globals')
  injectGlobals: true,

  // Enable ES modules and TypeScript support
  extensionsToTreatAsEsm: ['.ts'],

  // Map .js imports to .ts files for TypeScript ES modules
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            decorators: false,
          },
        },
        module: {
          type: 'es6',
        },
      },
    ],
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.functions.setup.js'],

  // Only test functions directory (include TypeScript)
  testMatch: [
    '**/__tests__/functions/**/*.test.[jt]s',
    '**/__tests__/integration/**/*.test.[jt]s',
  ],

  // Ignore frontend tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/components/',
    '/__tests__/utils/',
    '/__tests__/setup/',
  ],

  // Coverage for functions (include TypeScript)
  collectCoverageFrom: [
    'functions/**/*.{js,ts}',
    '!functions/index.{js,ts}', // Mostly boilerplate
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
