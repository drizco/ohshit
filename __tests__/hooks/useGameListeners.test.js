import { jest } from '@jest/globals'
import { renderHook } from '@testing-library/react'

// Create mocks before any imports
const mockUseFirebaseListener = jest.fn()
const mockCalculateAdjustedBid = jest.fn()
const mockRef = jest.fn((_dbInstance, path) => ({
  _path: path,
  toString: () => path,
}))
const mockQuery = jest.fn((ref, ...constraints) => ({
  ...ref,
  _query: true,
  _constraints: constraints,
}))
const mockOrderByChild = jest.fn((child) => ({ _orderByChild: child }))
const mockEqualTo = jest.fn((value) => ({ _equalTo: value }))

// Mock Firebase lib
jest.unstable_mockModule('@/lib/firebase', () => ({
  db: {},
  auth: {},
}))

// Mock firebase/database
jest.unstable_mockModule('firebase/database', () => ({
  ref: mockRef,
  query: mockQuery,
  orderByChild: mockOrderByChild,
  equalTo: mockEqualTo,
}))

// Mock the hooks and utils modules
jest.unstable_mockModule('@/hooks/useFirebaseListener', () => ({
  default: mockUseFirebaseListener,
}))

jest.unstable_mockModule('@/utils/bidHelpers', () => ({
  calculateAdjustedBid: mockCalculateAdjustedBid,
}))

// Import hook after setting up mocks
let useGameListeners

beforeAll(async () => {
  const mod = await import('@/hooks/useGameListeners')
  useGameListeners = mod.default
})

describe('useGameListeners Hook', () => {
  let mockUpdateState
  let mockDispatchRound
  let mockSetError

  beforeEach(() => {
    jest.clearAllMocks()

    mockUpdateState = jest.fn((updater) => {
      // If updater is a function, we need to simulate calling it with prevState
      if (typeof updater === 'function') {
        updater({
          game: { roundId: 'round-1' },
          players: { p1: { playerId: 'p1' } },
          hand: [],
          bid: 3,
        })
      }
    })
    mockDispatchRound = jest.fn()
    mockSetError = jest.fn()

    mockCalculateAdjustedBid.mockReturnValue(3)
    mockUseFirebaseListener.mockImplementation(() => ({}))
  })

  describe('Players Listener', () => {
    test('sets up players listener with correct ref and event types', () => {
      renderHook(() =>
        useGameListeners({
          gameId: 'game-1',
          playerId: 'player-1',
          roundId: null,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          setError: mockSetError,
        })
      )

      // Find the players listener call
      const playersCall = mockUseFirebaseListener.mock.calls.find((call) => {
        const config = call[0]
        return config.ref?._path === 'games/game-1/players'
      })

      expect(playersCall).toBeDefined()
      const config = playersCall[0]
      expect(config.enabled).toBe(true)
      expect(config.eventType).toEqual(['child_added', 'child_changed'])
    })

    test('players listener updates state correctly', () => {
      renderHook(() =>
        useGameListeners({
          gameId: 'game-1',
          playerId: 'player-1',
          roundId: null,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          setError: mockSetError,
        })
      )

      // Get the onData callback from players listener
      const playersCall = mockUseFirebaseListener.mock.calls.find((call) => {
        const config = call[0]
        return config.ref?._path === 'games/game-1/players'
      })

      const { onData } = playersCall[0]

      // Simulate Firebase calling onData
      const mockSnapshot = {
        val: () => ({ playerId: 'p1', name: 'Player 1' }),
        key: 'p1',
      }

      onData(mockSnapshot, 'child_added')

      expect(mockUpdateState).toHaveBeenCalled()
    })

    test('does not set up players listener when gameId is null', () => {
      renderHook(() =>
        useGameListeners({
          gameId: null,
          playerId: 'player-1',
          roundId: null,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          setError: mockSetError,
        })
      )

      // Players listener should have enabled: false when gameId is null
      const playersCall = mockUseFirebaseListener.mock.calls.find((call) => {
        const config = call[0]
        return config.ref === null || config.ref?._path?.includes('players')
      })
      expect(playersCall[0].enabled).toBe(false)
    })
  })

  describe('Game Listener', () => {
    test('sets up game listeners with all event types', () => {
      renderHook(() =>
        useGameListeners({
          gameId: 'game-1',
          playerId: 'player-1',
          roundId: null,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          setError: mockSetError,
        })
      )

      // Find game listener calls (should be exactly at games/game-1, not including sub-paths)
      const gameCalls = mockUseFirebaseListener.mock.calls.filter((call) => {
        const config = call[0]
        const path = config.ref?._path || config.ref?.toString()
        return path === 'games/game-1'
      })

      // Should have 2 calls: one for child_added/child_changed, one for child_removed
      expect(gameCalls.length).toBe(2)

      // First call should be the consolidated update events (array)
      const updateCall = gameCalls.find((call) => Array.isArray(call[0].eventType))
      expect(updateCall).toBeDefined()
      expect(updateCall[0].eventType).toEqual(['child_added', 'child_changed'])

      // Second call should be child_removed
      const removeCall = gameCalls.find((call) => call[0].eventType === 'child_removed')
      expect(removeCall).toBeDefined()
    })

    test('game child_removed listener sets key to null', () => {
      renderHook(() =>
        useGameListeners({
          gameId: 'game-1',
          playerId: 'player-1',
          roundId: null,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          game: { status: 'play' },
          players: {},
          bid: 0,
          setError: mockSetError,
        })
      )

      // Find the child_removed listener
      const removedCall = mockUseFirebaseListener.mock.calls.find((call) => {
        const config = call[0]
        return (
          config.ref?.toString().includes('games/') &&
          config.eventType === 'child_removed'
        )
      })

      const { onData } = removedCall[0]

      const mockSnapshot = {
        val: () => 'play',
        key: 'status',
      }

      onData(mockSnapshot, 'child_removed')

      expect(mockUpdateState).toHaveBeenCalled()
      const updaterFn = mockUpdateState.mock.calls[0][0]
      const result = updaterFn({ game: { status: 'play', roundId: 'r1' } })
      expect(result.game.status).toBeNull()
    })
  })

  describe('Hand Listener', () => {
    test('sets up hand listener when playerId and roundId are present', () => {
      renderHook(() =>
        useGameListeners({
          gameId: 'game-1',
          playerId: 'player-1',
          roundId: 'round-1',
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          game: {},
          players: {},
          bid: 0,
          setError: mockSetError,
        })
      )

      const handCalls = mockUseFirebaseListener.mock.calls.filter((call) => {
        const config = call[0]
        const path = config.ref?._path || config.ref?.toString()
        return path === 'games/game-1/players/player-1/hands/round-1/cards'
      })

      expect(handCalls.length).toBe(2) // child_added, child_removed

      const eventTypes = handCalls.map((call) => call[0].eventType)
      expect(eventTypes).toContain('child_added')
      expect(eventTypes).toContain('child_removed')
    })

    test('does not set up hand listener when playerId is missing', () => {
      renderHook(() =>
        useGameListeners({
          gameId: 'game-1',
          playerId: null,
          roundId: 'round-1',
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          setError: mockSetError,
        })
      )

      const handCalls = mockUseFirebaseListener.mock.calls.filter((call) => {
        const config = call[0]
        const path = config.ref?._path || config.ref?.toString()
        return path && path.includes('hands/') && config.enabled === true
      })

      expect(handCalls.length).toBe(0)
    })

    test('hand child_added prevents duplicate cards', () => {
      renderHook(() =>
        useGameListeners({
          gameId: 'game-1',
          playerId: 'player-1',
          roundId: 'round-1',
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          setError: mockSetError,
        })
      )

      const handAddedCall = mockUseFirebaseListener.mock.calls.find((call) => {
        const config = call[0]
        const path = config.ref?._path || config.ref?.toString()
        return (
          path === 'games/game-1/players/player-1/hands/round-1/cards' &&
          config.eventType === 'child_added'
        )
      })

      const { onData } = handAddedCall[0]

      const mockSnapshot = {
        val: () => ({ cardId: 'card-1', rank: 5, suit: 'H' }),
        key: 'card-1',
      }

      onData(mockSnapshot, 'child_added')

      expect(mockUpdateState).toHaveBeenCalled()
      const updaterFn = mockUpdateState.mock.calls[0][0]

      // Test with card not in hand
      const resultNew = updaterFn({ hand: [] })
      expect(resultNew.hand.length).toBe(1)

      // Test with card already in hand
      mockUpdateState.mockClear()
      onData(mockSnapshot, 'child_added')
      const updaterFn2 = mockUpdateState.mock.calls[0][0]
      const resultDupe = updaterFn2({
        hand: [{ cardId: 'card-1', rank: 5, suit: 'H' }],
      })
      expect(resultDupe).toEqual({})
    })
  })

  describe('Trump Listener', () => {
    test('sets up trump listener when roundId is present', () => {
      renderHook(() =>
        useGameListeners({
          gameId: 'game-1',
          playerId: 'player-1',
          roundId: 'round-1',
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          game: {},
          players: {},
          bid: 0,
          setError: mockSetError,
        })
      )

      const trumpCall = mockUseFirebaseListener.mock.calls.find((call) => {
        const config = call[0]
        return config.ref?.toString().includes('rounds/round-1/trump')
      })

      expect(trumpCall).toBeDefined()
      const config = trumpCall[0]
      expect(config.enabled).toBe(true)
      expect(config.eventType).toBe('value')
    })

    test('trump listener dispatches SET_TRUMP action', () => {
      renderHook(() =>
        useGameListeners({
          gameId: 'game-1',
          playerId: 'player-1',
          roundId: 'round-1',
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          game: {},
          players: {},
          bid: 0,
          setError: mockSetError,
        })
      )

      const trumpCall = mockUseFirebaseListener.mock.calls.find((call) => {
        const config = call[0]
        return config.ref?.toString().includes('rounds/round-1/trump')
      })

      const { onData } = trumpCall[0]

      const mockSnapshot = {
        val: () => 'H',
        key: 'trump',
      }

      onData(mockSnapshot, 'value')

      expect(mockDispatchRound).toHaveBeenCalledWith({
        type: 'SET_TRUMP',
        trump: 'H',
      })
    })
  })

  describe('Tricks Listener', () => {
    test('sets up tricks listener with correct event types', () => {
      renderHook(() =>
        useGameListeners({
          gameId: 'game-1',
          playerId: 'player-1',
          roundId: 'round-1',
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          game: {},
          players: {},
          bid: 0,
          setError: mockSetError,
        })
      )

      const tricksCall = mockUseFirebaseListener.mock.calls.find((call) => {
        const config = call[0]
        return config.ref?.toString().includes('rounds/round-1/tricks')
      })

      expect(tricksCall).toBeDefined()
      const config = tricksCall[0]
      expect(config.enabled).toBe(true)
      expect(config.eventType).toEqual(['child_added', 'child_changed'])
    })

    test('tricks child_added dispatches ADD_TRICK', () => {
      renderHook(() =>
        useGameListeners({
          gameId: 'game-1',
          playerId: 'player-1',
          roundId: 'round-1',
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          game: {},
          players: {},
          bid: 0,
          setError: mockSetError,
        })
      )

      const tricksCall = mockUseFirebaseListener.mock.calls.find((call) => {
        const config = call[0]
        return config.ref?.toString().includes('rounds/round-1/tricks')
      })

      const { onData } = tricksCall[0]

      const mockSnapshot = {
        val: () => ({ trickId: 1, cards: { p1: 'card' } }),
        key: 'trick1',
      }

      onData(mockSnapshot, 'child_added')

      expect(mockDispatchRound).toHaveBeenCalledWith({
        type: 'ADD_TRICK',
        trick: { trickId: 1, cards: { p1: 'card' } },
      })
    })

    test('tricks child_changed dispatches UPDATE_TRICK', () => {
      renderHook(() =>
        useGameListeners({
          gameId: 'game-1',
          playerId: 'player-1',
          roundId: 'round-1',
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          onTrickWon: jest.fn(),
          game: {},
          players: {},
          bid: 0,
          setError: mockSetError,
        })
      )

      const tricksCall = mockUseFirebaseListener.mock.calls.find((call) => {
        const config = call[0]
        return config.ref?.toString().includes('rounds/round-1/tricks')
      })

      const { onData } = tricksCall[0]

      const mockSnapshot = {
        val: () => ({ trickId: 1, cards: { p1: 'card' }, winner: 'p1' }),
        key: 'trick1',
      }

      onData(mockSnapshot, 'child_changed')

      expect(mockDispatchRound).toHaveBeenCalledWith({
        type: 'UPDATE_TRICK',
        trick: { trickId: 1, cards: { p1: 'card' }, winner: 'p1' },
      })
    })
  })

  describe('Bids Listener', () => {
    test('sets up bids listener with correct event type', () => {
      renderHook(() =>
        useGameListeners({
          gameId: 'game-1',
          playerId: 'player-1',
          roundId: 'round-1',
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          game: {},
          players: {},
          bid: 3,
          setError: mockSetError,
        })
      )

      const bidsCall = mockUseFirebaseListener.mock.calls.find((call) => {
        const config = call[0]
        return config.ref?.toString().includes('rounds/round-1/bids')
      })

      expect(bidsCall).toBeDefined()
      const config = bidsCall[0]
      expect(config.enabled).toBe(true)
      expect(config.eventType).toBe('child_added')
    })

    test('bids child_added dispatches UPDATE_BID and adjusts bid', () => {
      mockCalculateAdjustedBid.mockReturnValue(2)

      renderHook(() =>
        useGameListeners({
          gameId: 'game-1',
          playerId: 'player-1',
          roundId: 'round-1',
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          game: {},
          players: {},
          bid: 3,
          setError: mockSetError,
        })
      )

      const bidsCall = mockUseFirebaseListener.mock.calls.find((call) => {
        const config = call[0]
        return config.ref?.toString().includes('rounds/round-1/bids')
      })

      const { onData } = bidsCall[0]

      const mockSnapshot = {
        val: () => 2,
        key: 'p1',
      }

      onData(mockSnapshot, 'child_added')

      expect(mockDispatchRound).toHaveBeenCalledWith({
        type: 'UPDATE_BID',
        playerId: 'p1',
        bidValue: 2,
      })

      expect(mockUpdateState).toHaveBeenCalled()
      expect(mockCalculateAdjustedBid).toHaveBeenCalled()
    })
  })

  describe('Listener Re-initialization', () => {
    test('updates listeners when roundId changes', () => {
      const { rerender } = renderHook(
        ({ roundId }) =>
          useGameListeners({
            gameId: 'game-1',
            playerId: 'player-1',
            roundId,
            updateState: mockUpdateState,
            dispatchRound: mockDispatchRound,
            game: {},
            players: {},
            bid: 0,
            setError: mockSetError,
          }),
        {
          initialProps: { roundId: 'round-1' },
        }
      )

      // Get initial tricks listener count
      const initialTricksListeners = mockUseFirebaseListener.mock.calls.filter((call) => {
        const config = call[0]
        return config.ref?.toString().includes('rounds/round-1/tricks')
      })

      expect(initialTricksListeners.length).toBe(1)

      // Change roundId
      rerender({ roundId: 'round-2' })

      // Should have new listener for round-2
      const newTricksListeners = mockUseFirebaseListener.mock.calls.filter((call) => {
        const config = call[0]
        return config.ref?.toString().includes('rounds/round-2/tricks')
      })

      expect(newTricksListeners.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    test('handles errors in listeners', () => {
      renderHook(() =>
        useGameListeners({
          gameId: 'game-1',
          playerId: 'player-1',
          roundId: 'round-1',
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          game: {},
          players: {},
          bid: 0,
          setError: mockSetError,
        })
      )

      // Get any listener's onError callback
      const anyCall = mockUseFirebaseListener.mock.calls[0]
      const { onError } = anyCall[0]

      const testError = new Error('Firebase error')
      onError(testError)

      expect(mockSetError).toHaveBeenCalledWith('Firebase error')
    })
  })

  describe('removeListeners', () => {
    test('provides removeListeners function', () => {
      const { result } = renderHook(() =>
        useGameListeners({
          gameId: 'game-1',
          playerId: 'player-1',
          roundId: 'round-1',
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          game: {},
          players: {},
          bid: 0,
          setError: mockSetError,
        })
      )

      expect(result.current.removeListeners).toBeDefined()
      expect(typeof result.current.removeListeners).toBe('function')
    })
  })
})
