import { jest, expect } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

// Mock localStorage - must support Object.keys() for cleanup logic
// JSDOM provides its own localStorage, so we need to properly override it
const localStorageMock = {}

localStorageMock.getItem = jest.fn((key) => {
  return localStorageMock[key] !== undefined ? localStorageMock[key] : null
})

localStorageMock.setItem = jest.fn((key, value) => {
  localStorageMock[key] = value
})

localStorageMock.removeItem = jest.fn((key) => {
  delete localStorageMock[key]
})

localStorageMock.clear = jest.fn(() => {
  Object.keys(localStorageMock).forEach((key) => {
    if (typeof localStorageMock[key] !== 'function') {
      delete localStorageMock[key]
    }
  })
})

// Delete JSDOM's localStorage and replace with our mock
delete global.localStorage
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

// Import hook after setting up mocks
let useGameState

beforeAll(async () => {
  const mod = await import('@/hooks/useGameState')
  useGameState = mod.default
})

describe('useGameState Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear storage
    localStorageMock.clear()
  })

  describe('Initial State', () => {
    test('initializes with default state', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      expect(result.current.state).toEqual({
        game: null,
        players: {},
        playerId: null,
        playerName: '',
        hand: [],
        bid: 0,
        showYourTurn: false,
        queuedCard: null,
        lastWinner: null,
        lastCompletedTrick: null,
      })
    })

    test('initializes with default round state', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      expect(result.current.roundState).toEqual({
        tricks: [],
        bids: {},
        trump: null,
      })
    })

    test('provides refs', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      expect(result.current.listeners).toBeDefined()
      expect(result.current.listeners.current).toEqual({
        players: [],
        game: [],
        hand: [],
        trump: [],
        tricks: [],
        bids: [],
      })
      expect(result.current.autoPlayTimeout).toBeDefined()
      expect(result.current.currentBidsRef).toBeDefined()
    })
  })

  describe('updateState', () => {
    test('updates state with object', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      act(() => {
        result.current.updateState({ playerId: 'player-123' })
      })

      expect(result.current.state.playerId).toBe('player-123')
    })

    test('updates multiple fields with object', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      act(() => {
        result.current.updateState({
          playerId: 'player-123',
          playerName: 'Alice',
          bid: 5,
        })
      })

      expect(result.current.state.playerId).toBe('player-123')
      expect(result.current.state.playerName).toBe('Alice')
      expect(result.current.state.bid).toBe(5)
    })

    test('updates state with function', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      // Set initial bid
      act(() => {
        result.current.updateState({ bid: 3 })
      })

      // Update using function
      act(() => {
        result.current.updateState((prev) => ({ bid: prev.bid + 2 }))
      })

      expect(result.current.state.bid).toBe(5)
    })

    test('merges updates with existing state', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      act(() => {
        result.current.updateState({
          playerId: 'player-123',
          playerName: 'Alice',
        })
      })

      act(() => {
        result.current.updateState({ bid: 5 })
      })

      expect(result.current.state).toEqual({
        game: null,
        players: {},
        playerId: 'player-123',
        playerName: 'Alice',
        hand: [],
        bid: 5,
        showYourTurn: false,
        queuedCard: null,
        lastWinner: null,
        lastCompletedTrick: null,
      })
    })
  })

  describe('Round Reducer', () => {
    test('dispatches LOAD_INITIAL action', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      const initialData = {
        tricks: [{ trickId: 1 }],
        bids: { p1: 3 },
        trump: 'H',
      }

      act(() => {
        result.current.dispatchRound({ type: 'LOAD_INITIAL', ...initialData })
      })

      expect(result.current.roundState.tricks).toEqual([{ trickId: 1 }])
      expect(result.current.roundState.bids).toEqual({ p1: 3 })
      expect(result.current.roundState.trump).toBe('H')
    })

    test('dispatches SET_TRICKS action', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      const tricks = [{ trickId: 1 }, { trickId: 2 }]

      act(() => {
        result.current.dispatchRound({ type: 'SET_TRICKS', tricks })
      })

      expect(result.current.roundState.tricks).toEqual(tricks)
    })

    test('dispatches ADD_TRICK action', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      act(() => {
        result.current.dispatchRound({
          type: 'ADD_TRICK',
          trick: { trickId: 1 },
        })
      })

      expect(result.current.roundState.tricks).toEqual([{ trickId: 1 }])

      act(() => {
        result.current.dispatchRound({
          type: 'ADD_TRICK',
          trick: { trickId: 2 },
        })
      })

      expect(result.current.roundState.tricks).toEqual([{ trickId: 1 }, { trickId: 2 }])
    })

    test('dispatches UPDATE_TRICK action', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      // Set initial tricks
      act(() => {
        result.current.dispatchRound({
          type: 'SET_TRICKS',
          tricks: [
            { trickId: 1, cards: {} },
            { trickId: 2, cards: {} },
          ],
        })
      })

      // Update second trick
      act(() => {
        result.current.dispatchRound({
          type: 'UPDATE_TRICK',
          trick: { trickId: 2, cards: { p1: 'card' } },
        })
      })

      expect(result.current.roundState.tricks[1]).toEqual({
        trickId: 2,
        cards: { p1: 'card' },
      })
    })

    test('dispatches SET_BIDS action', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      const bids = { p1: 3, p2: 2 }

      act(() => {
        result.current.dispatchRound({ type: 'SET_BIDS', bids })
      })

      expect(result.current.roundState.bids).toEqual(bids)
    })

    test('dispatches UPDATE_BID action', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      act(() => {
        result.current.dispatchRound({ type: 'SET_BIDS', bids: { p1: 3 } })
      })

      act(() => {
        result.current.dispatchRound({
          type: 'UPDATE_BID',
          playerId: 'p2',
          bidValue: 2,
        })
      })

      expect(result.current.roundState.bids).toEqual({ p1: 3, p2: 2 })
    })

    test('dispatches SET_TRUMP action', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      act(() => {
        result.current.dispatchRound({ type: 'SET_TRUMP', trump: 'S' })
      })

      expect(result.current.roundState.trump).toBe('S')
    })

    test('dispatches RESET action', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      // Set some state
      act(() => {
        result.current.dispatchRound({
          type: 'LOAD_INITIAL',
          tricks: [{ trickId: 1 }],
          bids: { p1: 3 },
          trump: 'H',
        })
      })

      // Reset
      act(() => {
        result.current.dispatchRound({ type: 'RESET' })
      })

      expect(result.current.roundState).toEqual({
        tricks: [],
        bids: {},
        trump: null,
      })
    })
  })

  describe('initializeGame', () => {
    test('resets state and loads from localStorage', () => {
      // Set up localStorage values
      localStorageMock.setItem('oh-shit-game-1-player-id', 'player-123')
      localStorageMock.setItem('player-name', 'Alice')

      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      // Set some initial state
      act(() => {
        result.current.updateState({ bid: 5, hand: ['card1'] })
      })

      let initResult
      act(() => {
        initResult = result.current.initializeGame()
      })

      expect(result.current.state.playerId).toBe('player-123')
      expect(result.current.state.playerName).toBe('Alice')
      expect(result.current.state.bid).toBe(0) // Reset to initial
      expect(result.current.state.hand).toEqual([]) // Reset to initial

      expect(initResult).toEqual({
        playerId: 'player-123',
        playerName: 'Alice',
      })
    })

    test('handles missing localStorage values', () => {
      // storageMap is already empty from beforeEach

      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      let initResult
      act(() => {
        initResult = result.current.initializeGame()
      })

      expect(result.current.state.playerId).toBeNull()
      expect(result.current.state.playerName).toBe('')
      expect(initResult).toEqual({ playerId: null, playerName: '' })
    })

    test('cleans up old localStorage entries', () => {
      // Set up localStorage with current game, old game, and unrelated key
      localStorageMock.setItem('oh-shit-game-1-player-id', 'player-123')
      localStorageMock.setItem('oh-shit-old-game-player-id', 'player-old')
      localStorageMock.setItem('other-key', 'some-value')

      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      act(() => {
        result.current.initializeGame()
      })

      // Should remove old game's player ID but keep current one
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'oh-shit-old-game-player-id'
      )
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith(
        'oh-shit-game-1-player-id'
      )
    })

    test('resets round state', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      // Set round state
      act(() => {
        result.current.dispatchRound({
          type: 'LOAD_INITIAL',
          tricks: [{ trickId: 1 }],
          bids: { p1: 3 },
          trump: 'H',
        })
      })

      // Initialize game should reset round state
      act(() => {
        result.current.initializeGame()
      })

      expect(result.current.roundState).toEqual({
        tricks: [],
        bids: {},
        trump: null,
      })
    })
  })

  describe('resetState', () => {
    test('resets state to initial', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      // Set some state
      act(() => {
        result.current.updateState({
          playerId: 'player-123',
          playerName: 'Alice',
          bid: 5,
          hand: ['card1'],
        })
      })

      // Reset
      act(() => {
        result.current.resetState()
      })

      expect(result.current.state).toEqual({
        game: null,
        players: {},
        playerId: null,
        playerName: '',
        hand: [],
        bid: 0,
        showYourTurn: false,
        queuedCard: null,
        lastWinner: null,
        lastCompletedTrick: null,
      })
    })

    test('resets round state to initial', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      // Set round state
      act(() => {
        result.current.dispatchRound({
          type: 'LOAD_INITIAL',
          tricks: [{ trickId: 1 }],
          bids: { p1: 3 },
          trump: 'H',
        })
      })

      // Reset
      act(() => {
        result.current.resetState()
      })

      expect(result.current.roundState).toEqual({
        tricks: [],
        bids: {},
        trump: null,
      })
    })
  })

  describe('Bids Ref Sync', () => {
    test('syncs currentBidsRef with reducer bids', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      expect(result.current.currentBidsRef.current).toEqual({})

      act(() => {
        result.current.dispatchRound({
          type: 'SET_BIDS',
          bids: { p1: 3, p2: 2 },
        })
      })

      expect(result.current.currentBidsRef.current).toEqual({ p1: 3, p2: 2 })
    })

    test('updates currentBidsRef when bids change', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      act(() => {
        result.current.dispatchRound({ type: 'SET_BIDS', bids: { p1: 3 } })
      })

      expect(result.current.currentBidsRef.current).toEqual({ p1: 3 })

      act(() => {
        result.current.dispatchRound({
          type: 'UPDATE_BID',
          playerId: 'p2',
          bidValue: 2,
        })
      })

      expect(result.current.currentBidsRef.current).toEqual({ p1: 3, p2: 2 })
    })
  })

  describe('Refs Persistence', () => {
    test('listeners ref persists across renders', () => {
      const { result, rerender } = renderHook(() => useGameState({ gameId: 'game-1' }))

      const initialListeners = result.current.listeners

      rerender()

      expect(result.current.listeners).toBe(initialListeners)
    })

    test('autoPlayTimeout ref persists across renders', () => {
      const { result, rerender } = renderHook(() => useGameState({ gameId: 'game-1' }))

      const initialTimeout = result.current.autoPlayTimeout

      rerender()

      expect(result.current.autoPlayTimeout).toBe(initialTimeout)
    })

    test('listeners ref can be modified', () => {
      const { result } = renderHook(() => useGameState({ gameId: 'game-1' }))

      const mockUnsub = jest.fn()

      act(() => {
        result.current.listeners.current.players.push(mockUnsub)
      })

      expect(result.current.listeners.current.players).toEqual([mockUnsub])
    })
  })
})
