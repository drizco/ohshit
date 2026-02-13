/** @type {import('jest').Config} */
export default {
  // Use jsdom for browser-like environment
  testEnvironment: 'jsdom',

  // Inject globals automatically (no need to import from '@jest/globals')
  injectGlobals: true,

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.js'],

  // Test match patterns
  testMatch: ['**/__tests__/**/*.test.js', '**/__tests__/**/*.spec.js'],

  // Ignore functions tests (they have their own config)
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/out/',
    '/__tests__/functions/',
    '/__tests__/integration/',
    '/__tests__/setup/',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/pages/_app.js',
    '!src/pages/_document.js',
    '!**/*.stories.js',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Module path aliases (match Next.js paths)
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/context/(.*)$': '<rootDir>/src/context/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    // Mock Firebase SDK
    '^firebase/database$': '<rootDir>/__tests__/setup/firebaseMock.js',
    '^firebase/auth$': '<rootDir>/__tests__/setup/firebaseMock.js',
    '^firebase/app$': '<rootDir>/__tests__/setup/firebaseMock.js',
    // Mock CSS/SCSS imports
    '\\.(css|scss|sass)$': '<rootDir>/__tests__/setup/styleMock.js',
    // Mock image imports
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__tests__/setup/fileMock.js',
  },

  // Use SWC for JSX transformation while preserving ES modules
  transform: {
    '^.+\\.(js|jsx)$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'ecmascript',
            jsx: true,
          },
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
          experimental: {
            plugins: [['@swc/plugin-styled-jsx', {}]],
          },
        },
        module: {
          type: 'es6',
        },
      },
    ],
  },

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,
}
