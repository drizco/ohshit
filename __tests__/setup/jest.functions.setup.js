// Jest setup for Firebase Functions tests
import { jest } from '@jest/globals'

// Mock environment variables
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: 'test-project',
  databaseURL: 'https://test-project.firebaseio.com',
  storageBucket: 'test-project.appspot.com',
})

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks()
})
