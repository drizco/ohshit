import { jest } from '@jest/globals'
import { renderHook } from '@testing-library/react'

// Create mocks before any imports
const mockOnValue = jest.fn()
const mockOnChildAdded = jest.fn()
const mockOnChildChanged = jest.fn()
const mockOnChildRemoved = jest.fn()
const mockGet = jest.fn()

// Mock firebase/database module
jest.unstable_mockModule('firebase/database', () => ({
  onValue: mockOnValue,
  onChildAdded: mockOnChildAdded,
  onChildChanged: mockOnChildChanged,
  onChildRemoved: mockOnChildRemoved,
  get: mockGet,
}))

// Import hook after setting up mocks
let useFirebaseListener

beforeAll(async () => {
  const imported = await import('@/hooks/useFirebaseListener')
  useFirebaseListener = imported.default
})

describe('useFirebaseListener Hook', () => {
  let mockRef
  let mockOnData
  let mockOnError
  let mockUnsub

  beforeEach(() => {
    mockRef = { path: '/test/path' }
    mockOnData = jest.fn()
    mockOnError = jest.fn()
    mockUnsub = jest.fn()

    // Reset all mocks
    jest.clearAllMocks()

    // Default mock implementations
    mockOnValue.mockReturnValue(mockUnsub)
    mockOnChildAdded.mockReturnValue(mockUnsub)
    mockOnChildChanged.mockReturnValue(mockUnsub)
    mockOnChildRemoved.mockReturnValue(mockUnsub)
    mockGet.mockResolvedValue({
      val: () => ({}),
      key: 'test-key',
    })
  })

  describe('Basic Listener Setup', () => {
    test('sets up onValue listener by default', () => {
      renderHook(() =>
        useFirebaseListener({
          ref: mockRef,
          onData: mockOnData,
        })
      )

      expect(mockOnValue).toHaveBeenCalledWith(
        mockRef,
        expect.any(Function),
        expect.any(Function)
      )
    })

    test('sets up onChildAdded listener when specified', () => {
      renderHook(() =>
        useFirebaseListener({
          ref: mockRef,
          eventType: 'child_added',
          onData: mockOnData,
        })
      )

      expect(mockOnChildAdded).toHaveBeenCalledWith(
        mockRef,
        expect.any(Function),
        expect.any(Function)
      )
    })

    test('sets up onChildChanged listener when specified', () => {
      renderHook(() =>
        useFirebaseListener({
          ref: mockRef,
          eventType: 'child_changed',
          onData: mockOnData,
        })
      )

      expect(mockOnChildChanged).toHaveBeenCalledWith(
        mockRef,
        expect.any(Function),
        expect.any(Function)
      )
    })

    test('sets up onChildRemoved listener when specified', () => {
      renderHook(() =>
        useFirebaseListener({
          ref: mockRef,
          eventType: 'child_removed',
          onData: mockOnData,
        })
      )

      expect(mockOnChildRemoved).toHaveBeenCalledWith(
        mockRef,
        expect.any(Function),
        expect.any(Function)
      )
    })

    test('sets up multiple listeners when array provided', () => {
      renderHook(() =>
        useFirebaseListener({
          ref: mockRef,
          eventType: ['child_added', 'child_changed'],
          onData: mockOnData,
        })
      )

      expect(mockOnChildAdded).toHaveBeenCalledWith(
        mockRef,
        expect.any(Function),
        expect.any(Function)
      )
      expect(mockOnChildChanged).toHaveBeenCalledWith(
        mockRef,
        expect.any(Function),
        expect.any(Function)
      )
    })
  })

  describe('Listener Cleanup', () => {
    test('cleans up listener on unmount', () => {
      const { unmount } = renderHook(() =>
        useFirebaseListener({
          ref: mockRef,
          onData: mockOnData,
        })
      )

      expect(mockUnsub).not.toHaveBeenCalled()

      unmount()

      expect(mockUnsub).toHaveBeenCalled()
    })

    test('cleans up all listeners when multiple event types', () => {
      const mockUnsub1 = jest.fn()
      const mockUnsub2 = jest.fn()

      mockOnChildAdded.mockReturnValue(mockUnsub1)
      mockOnChildChanged.mockReturnValue(mockUnsub2)

      const { unmount } = renderHook(() =>
        useFirebaseListener({
          ref: mockRef,
          eventType: ['child_added', 'child_changed'],
          onData: mockOnData,
        })
      )

      unmount()

      expect(mockUnsub1).toHaveBeenCalled()
      expect(mockUnsub2).toHaveBeenCalled()
    })
  })

  describe('Conditional Enabling', () => {
    test('does not set up listeners when enabled is false', () => {
      renderHook(() =>
        useFirebaseListener({
          ref: mockRef,
          enabled: false,
          onData: mockOnData,
        })
      )

      expect(mockOnValue).not.toHaveBeenCalled()
    })

    test('does not set up listeners when ref is null', () => {
      renderHook(() =>
        useFirebaseListener({
          ref: null,
          onData: mockOnData,
        })
      )

      expect(mockOnValue).not.toHaveBeenCalled()
    })

    test('sets up listeners when enabled changes to true', () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          useFirebaseListener({
            ref: mockRef,
            enabled,
            onData: mockOnData,
          }),
        {
          initialProps: { enabled: false },
        }
      )

      expect(mockOnValue).not.toHaveBeenCalled()

      rerender({ enabled: true })

      expect(mockOnValue).toHaveBeenCalled()
    })
  })

  describe('Data Callbacks', () => {
    test('calls onData callback with snapshot when data received', () => {
      mockOnValue.mockImplementation((ref, onData) => {
        // Simulate Firebase calling the callback
        onData({ val: () => ({ test: 'data' }), key: 'test-key' })
        return mockUnsub
      })

      renderHook(() =>
        useFirebaseListener({
          ref: mockRef,
          onData: mockOnData,
        })
      )

      expect(mockOnData).toHaveBeenCalledWith(
        expect.objectContaining({
          val: expect.any(Function),
          key: 'test-key',
        }),
        'value'
      )
    })

    test('calls onData with correct event type for child_added', () => {
      mockOnChildAdded.mockImplementation((ref, onData) => {
        onData({ val: () => ({ id: '123' }), key: '123' })
        return mockUnsub
      })

      renderHook(() =>
        useFirebaseListener({
          ref: mockRef,
          eventType: 'child_added',
          onData: mockOnData,
        })
      )

      expect(mockOnData).toHaveBeenCalledWith(expect.any(Object), 'child_added')
    })

    test('calls onData with correct event type for child_changed', () => {
      mockOnChildChanged.mockImplementation((ref, onData) => {
        onData({ val: () => ({ id: '123' }), key: '123' })
        return mockUnsub
      })

      renderHook(() =>
        useFirebaseListener({
          ref: mockRef,
          eventType: 'child_changed',
          onData: mockOnData,
        })
      )

      expect(mockOnData).toHaveBeenCalledWith(expect.any(Object), 'child_changed')
    })
  })

  describe('Error Handling', () => {
    test('calls onError callback when Firebase returns error', () => {
      const testError = new Error('Firebase error')

      mockOnValue.mockImplementation((ref, onData, onError) => {
        // Simulate Firebase calling error callback
        onError(testError)
        return mockUnsub
      })

      renderHook(() =>
        useFirebaseListener({
          ref: mockRef,
          onData: mockOnData,
          onError: mockOnError,
        })
      )

      expect(mockOnError).toHaveBeenCalledWith(testError)
    })

    test('calls onError when data callback throws', () => {
      const testError = new Error('Processing error')
      const throwingOnData = jest.fn(() => {
        throw testError
      })

      mockOnValue.mockImplementation((ref, onData) => {
        onData({ val: () => ({}), key: 'test' })
        return mockUnsub
      })

      renderHook(() =>
        useFirebaseListener({
          ref: mockRef,
          onData: throwingOnData,
          onError: mockOnError,
        })
      )

      expect(mockOnError).toHaveBeenCalledWith(testError)
    })

    test('sets error state when error occurs', () => {
      const testError = new Error('Firebase error')

      mockOnValue.mockImplementation((ref, onData, onError) => {
        onError(testError)
        return mockUnsub
      })

      const { result } = renderHook(() =>
        useFirebaseListener({
          ref: mockRef,
          onData: mockOnData,
        })
      )

      expect(result.current.error).toBe(testError)
    })
  })

  describe('Initial Load Pattern', () => {})

  describe('Ref Changes', () => {
    test('re-sets up listeners when ref changes', () => {
      const mockRef2 = { path: '/test/path2' }

      const { rerender } = renderHook(
        ({ ref }) =>
          useFirebaseListener({
            ref,
            onData: mockOnData,
          }),
        {
          initialProps: { ref: mockRef },
        }
      )

      expect(mockOnValue).toHaveBeenCalledTimes(1)
      expect(mockOnValue).toHaveBeenCalledWith(
        mockRef,
        expect.any(Function),
        expect.any(Function)
      )

      mockOnValue.mockClear()

      rerender({ ref: mockRef2 })

      expect(mockUnsub).toHaveBeenCalled()
      expect(mockOnValue).toHaveBeenCalledTimes(1)
      expect(mockOnValue).toHaveBeenCalledWith(
        mockRef2,
        expect.any(Function),
        expect.any(Function)
      )
    })
  })

  describe('Edge Cases', () => {
    test('handles unknown event type gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      renderHook(() =>
        useFirebaseListener({
          ref: mockRef,
          eventType: 'invalid_event_type',
          onData: mockOnData,
        })
      )

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unknown event type: invalid_event_type'
      )

      consoleWarnSpy.mockRestore()
    })

    test('handles null onData callback gracefully', () => {
      mockOnValue.mockImplementation((ref, onData) => {
        // This should not throw
        onData({ val: () => ({}), key: 'test' })
        return mockUnsub
      })

      expect(() => {
        renderHook(() =>
          useFirebaseListener({
            ref: mockRef,
            onData: null,
          })
        )
      }).not.toThrow()
    })
  })
})
