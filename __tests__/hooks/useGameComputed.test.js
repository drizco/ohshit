import { jest } from '@jest/globals'
import { renderHook } from '@testing-library/react'

// Create mock before import
const mockGetScore = jest.fn()

// Mock the helpers module
jest.unstable_mockModule('@/utils/helpers', () => ({
  getScore: mockGetScore,
}))

// Import hook after setting up mocks
let useGameComputed

beforeAll(async () => {
  const mod = await import('@/hooks/useGameComputed')
  useGameComputed = mod.default
})

describe('useGameComputed Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetScore.mockReturnValue({})
  })

  describe('trickIndex', () => {
    test('returns 0 when tricks array is empty', () => {
      const { result } = renderHook(() =>
        useGameComputed({
          tricks: [],
          players: {},
          playerId: null,
        })
      )

      expect(result.current.trickIndex).toBe(0)
    })

    test('returns tricks.length - 1 when tricks exist', () => {
      const tricks = [{ trickId: 1 }, { trickId: 2 }, { trickId: 3 }]

      const { result } = renderHook(() =>
        useGameComputed({
          tricks,
          players: {},
          playerId: null,
        })
      )

      expect(result.current.trickIndex).toBe(2)
    })

    test('returns 0 for a single trick', () => {
      const tricks = [{ trickId: 1 }]

      const { result } = renderHook(() =>
        useGameComputed({
          tricks,
          players: {},
          playerId: null,
        })
      )

      expect(result.current.trickIndex).toBe(0)
    })
  })

  describe('roundScore', () => {
    test('calls getScore with tricks', () => {
      const tricks = [
        { trickId: 1, winner: 'p1' },
        { trickId: 2, winner: 'p2' },
      ]
      const mockScore = { p1: 10, p2: 5 }
      mockGetScore.mockReturnValue(mockScore)

      const { result } = renderHook(() =>
        useGameComputed({
          tricks,
          players: {},
          playerId: null,
        })
      )

      expect(mockGetScore).toHaveBeenCalledWith(tricks)
      expect(result.current.roundScore).toEqual(mockScore)
    })

    test('handles empty tricks array', () => {
      mockGetScore.mockReturnValue({})

      const { result } = renderHook(() =>
        useGameComputed({
          tricks: [],
          players: {},
          playerId: null,
        })
      )

      expect(mockGetScore).toHaveBeenCalledWith([])
      expect(result.current.roundScore).toEqual({})
    })
  })

  describe('isHost', () => {
    test('returns true when player is host', () => {
      const players = {
        p1: { playerId: 'p1', name: 'Player 1', host: true },
        p2: { playerId: 'p2', name: 'Player 2', host: false },
      }

      const { result } = renderHook(() =>
        useGameComputed({
          tricks: [],
          players,
          playerId: 'p1',
        })
      )

      expect(result.current.isHost).toBe(true)
    })

    test('returns false when player is not host', () => {
      const players = {
        p1: { playerId: 'p1', name: 'Player 1', host: true },
        p2: { playerId: 'p2', name: 'Player 2', host: false },
      }

      const { result } = renderHook(() =>
        useGameComputed({
          tricks: [],
          players,
          playerId: 'p2',
        })
      )

      expect(result.current.isHost).toBe(false)
    })

    test('returns falsy when playerId is null', () => {
      const players = {
        p1: { playerId: 'p1', name: 'Player 1', host: true },
      }

      const { result } = renderHook(() =>
        useGameComputed({
          tricks: [],
          players,
          playerId: null,
        })
      )

      expect(result.current.isHost).toBeFalsy()
    })

    test('returns undefined when player not in players object', () => {
      const players = {
        p1: { playerId: 'p1', name: 'Player 1', host: true },
      }

      const { result } = renderHook(() =>
        useGameComputed({
          tricks: [],
          players,
          playerId: 'p2',
        })
      )

      expect(result.current.isHost).toBeUndefined()
    })

    test('returns undefined when host field is missing', () => {
      const players = {
        p1: { playerId: 'p1', name: 'Player 1' },
      }

      const { result } = renderHook(() =>
        useGameComputed({
          tricks: [],
          players,
          playerId: 'p1',
        })
      )

      expect(result.current.isHost).toBeUndefined()
    })
  })

  describe('trick', () => {
    test('returns current trick from trickIndex', () => {
      const tricks = [
        { trickId: 1, leadSuit: 'H' },
        { trickId: 2, leadSuit: 'S' },
        { trickId: 3, leadSuit: 'C' },
      ]

      const { result } = renderHook(() =>
        useGameComputed({
          tricks,
          players: {},
          playerId: null,
        })
      )

      expect(result.current.trick).toEqual({ trickId: 3, leadSuit: 'C' })
      expect(result.current.trickIndex).toBe(2)
    })

    test('returns first trick when only one trick exists', () => {
      const tricks = [{ trickId: 1, leadSuit: 'D' }]

      const { result } = renderHook(() =>
        useGameComputed({
          tricks,
          players: {},
          playerId: null,
        })
      )

      expect(result.current.trick).toEqual({ trickId: 1, leadSuit: 'D' })
      expect(result.current.trickIndex).toBe(0)
    })

    test('returns null when tricks array is empty', () => {
      const { result } = renderHook(() =>
        useGameComputed({
          tricks: [],
          players: {},
          playerId: null,
        })
      )

      expect(result.current.trick).toBeNull()
    })

    test('returns null when tricks is undefined', () => {
      const { result } = renderHook(() =>
        useGameComputed({
          tricks: undefined,
          players: {},
          playerId: null,
        })
      )

      expect(result.current.trick).toBeNull()
    })
  })

  describe('winner', () => {
    test('returns winner from current trick', () => {
      const tricks = [
        { trickId: 1, winner: 'p1' },
        { trickId: 2, winner: 'p2' },
      ]

      const { result } = renderHook(() =>
        useGameComputed({
          tricks,
          players: {},
          playerId: null,
        })
      )

      expect(result.current.winner).toBe('p2')
    })

    test('returns undefined when trick has no winner', () => {
      const tricks = [{ trickId: 1, leadSuit: 'H' }]

      const { result } = renderHook(() =>
        useGameComputed({
          tricks,
          players: {},
          playerId: null,
        })
      )

      expect(result.current.winner).toBeUndefined()
    })

    test('returns undefined when no tricks exist', () => {
      const { result } = renderHook(() =>
        useGameComputed({
          tricks: [],
          players: {},
          playerId: null,
        })
      )

      expect(result.current.winner).toBeUndefined()
    })
  })

  describe('leadSuit', () => {
    test('returns leadSuit from current trick', () => {
      const tricks = [
        { trickId: 1, leadSuit: 'H' },
        { trickId: 2, leadSuit: 'S' },
        { trickId: 3, leadSuit: 'C' },
      ]

      const { result } = renderHook(() =>
        useGameComputed({
          tricks,
          players: {},
          playerId: null,
        })
      )

      expect(result.current.leadSuit).toBe('C')
    })

    test('returns undefined when trick has no leadSuit', () => {
      const tricks = [{ trickId: 1 }]

      const { result } = renderHook(() =>
        useGameComputed({
          tricks,
          players: {},
          playerId: null,
        })
      )

      expect(result.current.leadSuit).toBeUndefined()
    })

    test('returns undefined when no tricks exist', () => {
      const { result } = renderHook(() =>
        useGameComputed({
          tricks: [],
          players: {},
          playerId: null,
        })
      )

      expect(result.current.leadSuit).toBeUndefined()
    })
  })

  describe('Memoization', () => {
    test('returns same object reference when inputs unchanged', () => {
      const tricks = [{ trickId: 1, leadSuit: 'H' }]
      const players = { p1: { host: true } }
      const playerId = 'p1'
      const bids = { p1: 3 }

      const { result, rerender } = renderHook(() =>
        useGameComputed({
          tricks,
          players,
          playerId,
          bids,
        })
      )

      const firstResult = result.current

      rerender()

      expect(result.current.trickIndex).toBe(firstResult.trickIndex)
      expect(result.current.roundScore).toBe(firstResult.roundScore)
      expect(result.current.isHost).toBe(firstResult.isHost)
      expect(result.current.trick).toBe(firstResult.trick)
      expect(result.current.winner).toBe(firstResult.winner)
      expect(result.current.leadSuit).toBe(firstResult.leadSuit)
    })

    test('updates when tricks change', () => {
      const initialTricks = [{ trickId: 1, leadSuit: 'H' }]
      const updatedTricks = [
        { trickId: 1, leadSuit: 'H' },
        { trickId: 2, leadSuit: 'S' },
      ]

      const { result, rerender } = renderHook(
        ({ tricks }) =>
          useGameComputed({
            tricks,
            players: {},
            playerId: null,
          }),
        {
          initialProps: { tricks: initialTricks },
        }
      )

      expect(result.current.trickIndex).toBe(0)
      expect(result.current.leadSuit).toBe('H')

      rerender({ tricks: updatedTricks })

      expect(result.current.trickIndex).toBe(1)
      expect(result.current.leadSuit).toBe('S')
    })

    test('updates when playerId changes', () => {
      const players = {
        p1: { playerId: 'p1', host: true },
        p2: { playerId: 'p2', host: false },
      }

      const { result, rerender } = renderHook(
        ({ playerId }) =>
          useGameComputed({
            tricks: [],
            players,
            playerId,
          }),
        {
          initialProps: { playerId: 'p1' },
        }
      )

      expect(result.current.isHost).toBe(true)

      rerender({ playerId: 'p2' })

      expect(result.current.isHost).toBe(false)
    })
  })

  describe('Default Parameters', () => {
    test('handles missing parameters with defaults', () => {
      const { result } = renderHook(() => useGameComputed({}))

      expect(result.current.trickIndex).toBe(0)
      expect(result.current.roundScore).toBeDefined()
      expect(result.current.isHost).toBeFalsy()
      expect(result.current.trick).toBeNull()
      expect(result.current.winner).toBeUndefined()
      expect(result.current.leadSuit).toBeUndefined()
    })
  })
})
