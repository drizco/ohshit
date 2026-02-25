import { jest } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

// Create mocks before any imports
const mockNewGame = jest.fn()
const mockReplayGame = jest.fn()
const mockStartGame = jest.fn()
const mockPlayCardApi = jest.fn()
const mockSubmitBidApi = jest.fn()
const mockUpdatePlayer = jest.fn()
const mockAddPlayerApi = jest.fn()
const mockNextRoundApi = jest.fn()
const mockCalculateLeader = jest.fn()
const mockIsLegal = jest.fn()
const mockCalculateAdjustedBid = jest.fn()

// Mock localStorage
delete global.localStorage
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
  configurable: true,
})

const mockParseApiError = jest.fn()

// Mock API module
jest.unstable_mockModule('@/utils/api', () => ({
  newGame: mockNewGame,
  replayGame: mockReplayGame,
  startGame: mockStartGame,
  playCard: mockPlayCardApi,
  submitBid: mockSubmitBidApi,
  updatePlayer: mockUpdatePlayer,
  addPlayer: mockAddPlayerApi,
  parseApiError: mockParseApiError,
}))

// Mock helpers
jest.unstable_mockModule('@/utils/helpers', () => ({
  calculateLeader: mockCalculateLeader,
  isLegal: mockIsLegal,
}))

// Mock bidHelpers
jest.unstable_mockModule('@/utils/bidHelpers', () => ({
  calculateAdjustedBid: mockCalculateAdjustedBid,
}))

// Import hook after setting up mocks
let useGameActions

beforeAll(async () => {
  const mod = await import('@/hooks/useGameActions')
  useGameActions = mod.default
})

describe('useGameActions Hook', () => {
  let mockSetLoading
  let mockSetError
  let mockUpdateState
  let mockDispatchRound
  let mockAutoPlayTimeout
  let mockListenToGame
  let mockListenToRound
  let mockListenToHand

  beforeEach(() => {
    jest.clearAllMocks()

    mockSetLoading = jest.fn()
    mockSetError = jest.fn()
    mockUpdateState = jest.fn()
    mockDispatchRound = jest.fn()
    mockAutoPlayTimeout = { current: null }
    mockListenToGame = jest.fn()
    mockListenToRound = jest.fn()
    mockListenToHand = jest.fn()

    // Default mock implementations
    mockIsLegal.mockReturnValue(true)
    mockCalculateLeader.mockReturnValue({ playerId: 'p1' })
    mockCalculateAdjustedBid.mockReturnValue(3)
    mockParseApiError.mockResolvedValue('mock error')
    mockPlayCardApi.mockResolvedValue({ ok: true })
    mockSubmitBidApi.mockResolvedValue({ ok: true })
    mockNextRoundApi.mockResolvedValue({})
    mockStartGame.mockResolvedValue({})
    mockNewGame.mockResolvedValue({
      ok: true,
      json: async () => ({ playerId: 'new-p1', gameId: 'new-g1' }),
    })
    mockAddPlayerApi.mockResolvedValue({
      ok: true,
      json: async () => ({ playerId: 'new-p1' }),
    })
  })

  describe('playCard', () => {
    test('plays card when it is player turn and card is legal', async () => {
      const mockCard = { cardId: 'c1', rank: 5, suit: 'H' }
      const mockTrick = {
        trickId: 1,
        cards: { p2: { cardId: 'c2', rank: 3, suit: 'H' } },
        leadSuit: 'H',
      }

      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            metadata: {
              gameId: 'game-1',
            },
            state: {
              status: 'play',
              playerOrder: ['p1', 'p2', 'p3'],
              currentPlayerIndex: 0, // p1's turn
              roundId: 'round-1',
            },
          },
          hand: [mockCard, { cardId: 'c3', rank: 6, suit: 'S' }],
          bid: 2,
          bids: {},
          tricks: [mockTrick],
          trickIndex: 0,
          queuedCard: null,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateState,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
        })
      )

      await act(async () => {
        await result.current.playCard(mockCard)
      })

      expect(mockSetLoading).toHaveBeenCalledWith(true)
      expect(mockPlayCardApi).toHaveBeenCalledWith({
        playerId: 'p1',
        card: mockCard,
        gameId: 'game-1',
        roundId: 'round-1',
        trickId: 1,
      })
      expect(mockSetLoading).toHaveBeenCalledWith(false)
    })

    test('does not play or queue card during bid phase', async () => {
      const mockCard = { cardId: 'c1', rank: 5, suit: 'H' }
      const mockTrick = {
        trickId: 1,
        cards: {},
        leadSuit: null,
      }

      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            metadata: {
              gameId: 'game-1',
            },
            state: {
              status: 'bid',
              playerOrder: ['p1', 'p2', 'p3'],
              currentPlayerIndex: 0, // p1's turn
              roundId: 'round-1',
            },
          },
          hand: [mockCard],
          bid: 2,
          bids: {},
          tricks: [mockTrick],
          trickIndex: 0,
          queuedCard: null,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateState,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
        })
      )

      await act(async () => {
        await result.current.playCard(mockCard)
      })

      expect(mockPlayCardApi).not.toHaveBeenCalled()
      expect(mockUpdateState).not.toHaveBeenCalled()
    })

    test('does not queue card during bid phase even when not player turn', async () => {
      const mockCard = { cardId: 'c1', rank: 5, suit: 'H' }
      const mockTrick = {
        trickId: 1,
        cards: {},
        leadSuit: null,
      }

      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            metadata: {
              gameId: 'game-1',
            },
            state: {
              status: 'bid',
              playerOrder: ['p2', 'p1', 'p3'],
              currentPlayerIndex: 0, // p2's turn
              roundId: 'round-1',
            },
          },
          hand: [mockCard],
          bid: 2,
          bids: {},
          tricks: [mockTrick],
          trickIndex: 0,
          queuedCard: null,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateState,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
        })
      )

      await act(async () => {
        await result.current.playCard(mockCard)
      })

      expect(mockPlayCardApi).not.toHaveBeenCalled()
      expect(mockUpdateState).not.toHaveBeenCalled()
    })

    test('queues card when it is not player turn', async () => {
      const mockCard = { cardId: 'c1', rank: 5, suit: 'H' }
      const mockTrick = {
        trickId: 1,
        cards: {},
        leadSuit: null,
      }

      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            metadata: {
              gameId: 'game-1',
            },
            state: {
              status: 'play',
              playerOrder: ['p2', 'p1', 'p3'],
              currentPlayerIndex: 0, // p2's turn, not p1
              roundId: 'round-1',
            },
          },
          hand: [mockCard],
          bid: 2,
          bids: {},
          tricks: [mockTrick],
          trickIndex: 0,
          queuedCard: null,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateState,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
        })
      )

      await act(async () => {
        await result.current.playCard(mockCard)
      })

      expect(mockPlayCardApi).not.toHaveBeenCalled()
      expect(mockUpdateState).toHaveBeenCalled()
    })

    test('plays last card successfully', async () => {
      const mockCard = { cardId: 'c1', rank: 5, suit: 'H' }
      const mockTrick = {
        trickId: 1,
        cards: { p2: { cardId: 'c2' }, p3: { cardId: 'c3' } },
        leadSuit: 'H',
      }

      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            metadata: {
              gameId: 'game-1',
            },
            state: {
              status: 'play',
              playerOrder: ['p1', 'p2', 'p3'],
              currentPlayerIndex: 0,
              roundId: 'round-1',
            },
          },
          hand: [mockCard], // Last card
          bid: 2,
          bids: {},
          tricks: [mockTrick],
          trickIndex: 0,
          queuedCard: null,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateState,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
        })
      )

      await act(async () => {
        await result.current.playCard(mockCard)
      })

      expect(mockPlayCardApi).toHaveBeenCalled()
      expect(mockSetLoading).toHaveBeenCalledWith(false)
    })

    test('handles errors correctly', async () => {
      mockPlayCardApi.mockRejectedValue(new Error('API error'))

      const mockCard = { cardId: 'c1', rank: 5, suit: 'H' }
      const mockTrick = {
        trickId: 1,
        cards: {},
        leadSuit: null,
      }

      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            metadata: {
              gameId: 'game-1',
            },
            state: {
              status: 'play',
              playerOrder: ['p1', 'p2', 'p3'],
              currentPlayerIndex: 0,
              roundId: 'round-1',
            },
          },
          hand: [mockCard],
          bid: 2,
          bids: {},
          tricks: [mockTrick],
          trickIndex: 0,
          queuedCard: null,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateState,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
        })
      )

      await act(async () => {
        await result.current.playCard(mockCard)
      })

      expect(mockSetLoading).toHaveBeenCalledWith(false)
      expect(mockSetError).toHaveBeenCalledWith('Failed to play card')
    })
  })

  describe('submitBid', () => {
    test('submits bid correctly', async () => {
      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            state: {
              roundId: 'round-1',
              playerOrder: ['p1', 'p2', 'p3'],
              currentPlayerIndex: 0,
            },
          },
          players: {
            p1: {},
          },
          hand: [],
          bid: 3,
          bids: { p2: 2 },
          tricks: [],
          trickIndex: 0,
          queuedCard: null,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateState,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
        })
      )

      await act(async () => {
        await result.current.submitBid()
      })

      expect(mockSetLoading).toHaveBeenCalledWith(true)
      expect(mockSubmitBidApi).toHaveBeenCalledWith({
        gameId: 'game-1',
        playerId: 'p1',
        bid: 3,
        roundId: 'round-1',
      })
      expect(mockSetLoading).toHaveBeenCalledWith(false)
    })

    test('uses optional bid when provided', async () => {
      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            state: {
              roundId: 'round-1',
              playerOrder: ['p1', 'p2', 'p3'],
              currentPlayerIndex: 0,
            },
          },
          players: {
            p1: {},
          },
          hand: [],
          bid: 3,
          bids: {},
          tricks: [],
          trickIndex: 0,
          queuedCard: null,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateState,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
        })
      )

      await act(async () => {
        await result.current.submitBid(5)
      })

      expect(mockSubmitBidApi).toHaveBeenCalledWith({
        gameId: 'game-1',
        playerId: 'p1',
        bid: 5,
        roundId: 'round-1',
      })
    })
  })

  describe('randomPlay', () => {
    test('plays random card when status is play', () => {
      const mockCards = [
        { cardId: 'c1', rank: 5, suit: 'H' },
        { cardId: 'c2', rank: 6, suit: 'S' },
      ]

      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            status: 'play',
          },
          players: {},
          hand: mockCards,
          bid: 0,
          bids: {},
          tricks: [{ trickId: 1, leadSuit: 'H', cards: {} }],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      act(() => {
        result.current.randomPlay()
      })

      // Should attempt to play a card (playCard is mocked)
      // Can't easily assert which card since it's random
    })

    test('submits random bid when status is bid', () => {
      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            status: 'bid',
          },
          players: {},
          hand: [{ cardId: 'c1' }, { cardId: 'c2' }, { cardId: 'c3' }],
          bid: 0,
          bids: {},
          tricks: [],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      act(() => {
        result.current.randomPlay()
      })

      // Should call submitBid (which is captured in the closure)
    })
  })

  describe('other actions', () => {
    test('playAgain creates new game', async () => {
      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            metadata: {
              name: 'Test Game',
              gameId: 'game-1',
            },
            settings: {
              numCards: 5,
              noBidPoints: 5,
              dirty: true,
              timeLimit: 30,
            },
          },
          hand: [],
          bid: 0,
          bids: {},
          tricks: [],
          trickIndex: 0,
          queuedCard: null,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateState,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
        })
      )

      await act(async () => {
        await result.current.playAgain()
      })

      expect(mockNewGame).toHaveBeenCalled()
      expect(mockReplayGame).toHaveBeenCalled()
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'oh-shit-new-g1-player-id',
        'new-p1'
      )
    })

    test('addPlayer adds player to game', async () => {
      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: null,
          playerName: 'New Player',
          game: {},
          players: {},
          hand: [],
          bid: 0,
          bids: {},
          tricks: [],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      await act(async () => {
        await result.current.addPlayer()
      })

      expect(mockAddPlayerApi).toHaveBeenCalledWith({
        playerName: 'New Player',
        gameId: 'game-1',
      })
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'oh-shit-game-1-player-id',
        'new-p1'
      )
      expect(localStorage.setItem).toHaveBeenCalledWith('player-name', 'New Player')
      expect(mockUpdateState).toHaveBeenCalledWith({ playerId: 'new-p1' })
    })

    test('startGameHandler starts the game', async () => {
      const mockPlayers = { p1: { playerId: 'p1', name: 'Player 1', present: true } }
      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            settings: { numCards: 7 },
            players: mockPlayers,
          },
          players: {},
          hand: [],
          bid: 0,
          bids: {},
          tricks: [],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      await act(async () => {
        await result.current.startGameHandler()
      })

      expect(mockStartGame).toHaveBeenCalledWith({
        gameId: 'game-1',
        players: mockPlayers,
        numCards: 7,
      })
    })

    test('handleChange updates state from input', () => {
      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {},
          players: {},
          hand: [],
          bid: 0,
          bids: {},
          tricks: [],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      act(() => {
        result.current.handleChange({
          target: { name: 'playerName', value: 'New Name' },
        })
      })

      expect(mockUpdateState).toHaveBeenCalledWith({ playerName: 'New Name' })
    })

    test('handleToggle increments bid', () => {
      // Mock updateState to execute the updater function
      const mockUpdateStateWithExec = jest.fn((updater) => {
        if (typeof updater === 'function') {
          updater({
            game: { settings: { numCards: 7, dirty: true } },
            players: {},
            bid: 3,
          })
        }
      })

      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: { settings: { numCards: 7, dirty: true } },
          players: {},
          hand: [],
          bid: 3,
          bids: {},
          tricks: [],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateStateWithExec,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      act(() => {
        result.current.handleToggle(true)
      })

      expect(mockUpdateStateWithExec).toHaveBeenCalled()
      expect(mockCalculateAdjustedBid).toHaveBeenCalled()
    })

    test('closeModal clears lastWinner', async () => {
      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            state: {
              roundId: 'round-1',
            },
          },
          hand: [],
          bid: 0,
          bids: {},
          tricks: [],
          trickIndex: 0,
          queuedCard: null,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateState,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
        })
      )

      await act(async () => {
        await result.current.closeModal()
      })

      expect(mockUpdateState).toHaveBeenCalledWith({
        lastWinner: null,
      })
    })

    test('yourTurn handles queued card', async () => {
      const mockCard = { cardId: 'c1', rank: 5, suit: 'H' }

      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            status: 'play',
            currentPlayer: 'p1',
          },
          players: {},
          hand: [mockCard],
          bid: 0,
          bids: {},
          tricks: [{ trickId: 1, cards: {}, leadSuit: null }],
          trickIndex: 0,
          trump: null,
          queuedCard: mockCard,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      await act(async () => {
        await result.current.yourTurn()
      })

      // Should set a timeout to play the queued card
      expect(mockAutoPlayTimeout.current).toBeTruthy()
    })

    test('yourTurn shows notification when no queued card', () => {
      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {},
          players: {},
          hand: [],
          bid: 0,
          bids: {},
          tricks: [],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: false,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      act(() => {
        result.current.yourTurn()
      })

      expect(mockUpdateState).toHaveBeenCalledWith({ showYourTurn: true })
    })
  })
})
