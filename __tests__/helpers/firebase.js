// Test helpers for Firebase mocking

/**
 * Creates a mock Firebase database reference
 */
export function createMockRef(data = {}) {
  const mockRef = jest.fn((path) => {
    const pathData = path ? getNestedValue(data, path) : data

    return {
      once: jest.fn(() =>
        Promise.resolve({
          exists: () => pathData !== undefined,
          val: () => pathData,
          key: path ? path.split('/').pop() : null,
        })
      ),
      on: jest.fn(),
      off: jest.fn(),
      set: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => Promise.resolve()),
      push: jest.fn(() => ({
        key: `generated-key-${Date.now()}`,
        set: jest.fn(() => Promise.resolve()),
      })),
      child: jest.fn((childPath) => mockRef(`${path}/${childPath}`)),
      orderByChild: jest.fn(() => ({
        equalTo: jest.fn(() => ({
          once: jest.fn(() =>
            Promise.resolve({
              val: () => pathData,
              exists: () => pathData !== undefined,
            })
          ),
        })),
      })),
      remove: jest.fn(() => Promise.resolve()),
    }
  })

  return mockRef
}

/**
 * Gets a nested value from an object using a path string
 */
function getNestedValue(obj, path) {
  if (!path) return obj
  return path.split('/').reduce((current, key) => {
    return current?.[key]
  }, obj)
}

/**
 * Creates a mock request object for Firebase Functions
 */
export function createMockRequest(body = {}, ref = null) {
  return {
    body,
    ref: ref || createMockRef(),
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  }
}

/**
 * Creates a mock response object for Firebase Functions
 */
export function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
  }
  return res
}

/**
 * Waits for all promises to resolve
 */
export function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve))
}

/**
 * Creates a snapshot object for Firebase
 */
export function createSnapshot(data, key = null) {
  return {
    exists: () => data !== null && data !== undefined,
    val: () => data,
    key,
    forEach: (callback) => {
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([childKey, childData]) => {
          callback(createSnapshot(childData, childKey))
        })
      }
    },
  }
}
