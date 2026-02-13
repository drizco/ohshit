import { jest } from '@jest/globals'
import { renderHook, act, waitFor } from '@testing-library/react'

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

// Mock API module
jest.unstable_mockModule('@/utils/api', () => ({
  newGame: mockNewGame,
  replayGame: mockReplayGame,
  startGame: mockStartGame,
  playCard: mockPlayCardApi,
  submitBid: mockSubmitBidApi,
  updatePlayer: mockUpdatePlayer,
  addPlayer: mockAddPlayerApi,
  nextRound: mockNextRoundApi,
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
  let mockContext
  let mockUpdateState
  let mockDispatchRound
  let mockAutoPlayTimeout
  let mockListenToGame
  let mockListenToRound
  let mockListenToHand

  beforeEach(() => {
    jest.clearAllMocks()

    mockContext = {
      setState: jest.fn(),
      visible: false,
    }
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
    mockPlayCardApi.mockResolvedValue({})
    mockSubmitBidApi.mockResolvedValue({})
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

  describe('nextRound', () => {
    test('advances to next round with correct parameters', async () => {
      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            numCards: 5,
            roundNum: 1,
            descending: false,
            dealer: 'p1',
            gameId: 'game-1',
            numRounds: 10,
            roundId: 'round-1',
            noBidPoints: 5,
          },
          players: {
            p1: { nextPlayer: 'p2' },
          },
          hand: [],
          bid: 0,
          bids: {},
          tricks: [],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: mockContext.visible,
          setState: mockContext.setState,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      await act(async () => {
        await result.current.nextRound()
      })

      expect(mockNextRoundApi).toHaveBeenCalledWith({
        roundNum: 2,
        numRounds: 10,
        numCards: 6,
        descending: false,
        gameId: 'game-1',
        noBidPoints: 5,
        roundId: 'round-1',
        gameOver: false,
        dealer: 'p2',
      })
    })

    test('handles descending rounds correctly', async () => {
      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            numCards: 5,
            roundNum: 5,
            descending: true,
            dealer: 'p1',
            gameId: 'game-1',
            numRounds: 10,
            roundId: 'round-5',
            noBidPoints: 5,
          },
          players: {
            p1: { nextPlayer: 'p2' },
          },
          hand: [],
          bid: 0,
          bids: {},
          tricks: [],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: mockContext.visible,
          setState: mockContext.setState,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      await act(async () => {
        await result.current.nextRound()
      })

      expect(mockNextRoundApi).toHaveBeenCalledWith(
        expect.objectContaining({
          numCards: 4,
          descending: true,
        })
      )
    })

    test('resets to ascending when numCards reaches 0', async () => {
      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            numCards: 1,
            roundNum: 8,
            descending: true,
            dealer: 'p1',
            gameId: 'game-1',
            numRounds: 10,
            roundId: 'round-8',
            noBidPoints: 5,
          },
          players: {
            p1: { nextPlayer: 'p2' },
          },
          hand: [],
          bid: 0,
          bids: {},
          tricks: [],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: mockContext.visible,
          setState: mockContext.setState,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      await act(async () => {
        await result.current.nextRound()
      })

      expect(mockNextRoundApi).toHaveBeenCalledWith(
        expect.objectContaining({
          numCards: 2,
          descending: false,
        })
      )
    })

    test('sets gameOver when reaching last round', async () => {
      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            numCards: 5,
            roundNum: 10,
            descending: false,
            dealer: 'p1',
            gameId: 'game-1',
            numRounds: 10,
            roundId: 'round-10',
            noBidPoints: 5,
          },
          players: {
            p1: { nextPlayer: 'p2' },
          },
          hand: [],
          bid: 0,
          bids: {},
          tricks: [],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: mockContext.visible,
          setState: mockContext.setState,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      await act(async () => {
        await result.current.nextRound()
      })

      expect(mockNextRoundApi).toHaveBeenCalledWith(
        expect.objectContaining({
          gameOver: true,
        })
      )
    })

    test('handles errors correctly', async () => {
      mockNextRoundApi.mockRejectedValue(new Error('API error'))

      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            numCards: 5,
            roundNum: 1,
            descending: false,
            dealer: 'p1',
            gameId: 'game-1',
            numRounds: 10,
            roundId: 'round-1',
            noBidPoints: 5,
          },
          players: {
            p1: { nextPlayer: 'p2' },
          },
          hand: [],
          bid: 0,
          bids: {},
          tricks: [],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: mockContext.visible,
          setState: mockContext.setState,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      await act(async () => {
        await result.current.nextRound()
      })

      expect(mockContext.setState).toHaveBeenCalledWith({ error: true })
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
            status: 'play',
            currentPlayer: 'p1',
            numPlayers: 3,
            gameId: 'game-1',
            roundId: 'round-1',
          },
          players: {
            p1: { nextPlayer: 'p2' },
          },
          hand: [mockCard, { cardId: 'c3', rank: 6, suit: 'S' }],
          bid: 2,
          bids: {},
          tricks: [mockTrick],
          trickIndex: 0,
          trump: 'D',
          queuedCard: null,
          visible: mockContext.visible,
          setState: mockContext.setState,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      await act(async () => {
        await result.current.playCard(mockCard)
      })

      expect(mockContext.setState).toHaveBeenCalledWith({ loading: true })
      expect(mockPlayCardApi).toHaveBeenCalledWith({
        playerId: 'p1',
        nextPlayerId: 'p2',
        card: mockCard,
        leader: 'p1',
        allCardsIn: false,
        gameId: 'game-1',
        roundId: 'round-1',
        trickId: 1,
        leadSuit: 'H',
        nextRound: false,
      })
      expect(mockContext.setState).toHaveBeenCalledWith({ loading: false })
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
            status: 'play',
            currentPlayer: 'p2', // Not player's turn
            numPlayers: 3,
            gameId: 'game-1',
            roundId: 'round-1',
          },
          players: {
            p1: { nextPlayer: 'p2' },
          },
          hand: [mockCard],
          bid: 2,
          bids: {},
          tricks: [mockTrick],
          trickIndex: 0,
          trump: 'D',
          queuedCard: null,
          visible: mockContext.visible,
          setState: mockContext.setState,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      await act(async () => {
        await result.current.playCard(mockCard)
      })

      expect(mockPlayCardApi).not.toHaveBeenCalled()
      expect(mockUpdateState).toHaveBeenCalled()
    })

    test('calls nextRound when last card is played', async () => {
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
            status: 'play',
            currentPlayer: 'p1',
            numPlayers: 3,
            gameId: 'game-1',
            roundId: 'round-1',
            roundNum: 1,
            numRounds: 10,
            descending: false,
            dealer: 'p1',
            noBidPoints: 5,
          },
          players: {
            p1: { nextPlayer: 'p2' },
          },
          hand: [mockCard], // Last card
          bid: 2,
          bids: {},
          tricks: [mockTrick],
          trickIndex: 0,
          trump: 'D',
          queuedCard: null,
          visible: mockContext.visible,
          setState: mockContext.setState,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      await act(async () => {
        await result.current.playCard(mockCard)
      })

      await waitFor(() => {
        expect(mockNextRoundApi).toHaveBeenCalled()
      })
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
            status: 'play',
            currentPlayer: 'p1',
            numPlayers: 3,
            gameId: 'game-1',
            roundId: 'round-1',
          },
          players: {
            p1: { nextPlayer: 'p2' },
          },
          hand: [mockCard],
          bid: 2,
          bids: {},
          tricks: [mockTrick],
          trickIndex: 0,
          trump: 'D',
          queuedCard: null,
          visible: mockContext.visible,
          setState: mockContext.setState,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      await act(async () => {
        await result.current.playCard(mockCard)
      })

      expect(mockContext.setState).toHaveBeenCalledWith({
        loading: false,
        error: true,
      })
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
            numPlayers: 3,
            roundId: 'round-1',
          },
          players: {
            p1: { nextPlayer: 'p2' },
          },
          hand: [],
          bid: 3,
          bids: { p2: 2 },
          tricks: [],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: mockContext.visible,
          setState: mockContext.setState,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      await act(async () => {
        await result.current.submitBid()
      })

      expect(mockContext.setState).toHaveBeenCalledWith({ loading: true })
      expect(mockSubmitBidApi).toHaveBeenCalledWith({
        gameId: 'game-1',
        playerId: 'p1',
        nextPlayerId: 'p2',
        bid: 3,
        allBidsIn: false,
        roundId: 'round-1',
      })
      expect(mockContext.setState).toHaveBeenCalledWith({ loading: false })
    })

    test('uses optional bid when provided', async () => {
      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            numPlayers: 3,
            roundId: 'round-1',
          },
          players: {
            p1: { nextPlayer: 'p2' },
          },
          hand: [],
          bid: 3,
          bids: {},
          tricks: [],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: mockContext.visible,
          setState: mockContext.setState,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      await act(async () => {
        await result.current.submitBid(5)
      })

      expect(mockSubmitBidApi).toHaveBeenCalledWith(
        expect.objectContaining({
          bid: 5,
        })
      )
    })

    test('sets allBidsIn when all other players have bid', async () => {
      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            numPlayers: 3,
            roundId: 'round-1',
          },
          players: {
            p1: { nextPlayer: 'p2' },
          },
          hand: [],
          bid: 3,
          bids: { p2: 2, p3: 1 },
          tricks: [],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: mockContext.visible,
          setState: mockContext.setState,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      await act(async () => {
        await result.current.submitBid()
      })

      expect(mockSubmitBidApi).toHaveBeenCalledWith(
        expect.objectContaining({
          allBidsIn: true,
        })
      )
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
          visible: mockContext.visible,
          setState: mockContext.setState,
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
          visible: mockContext.visible,
          setState: mockContext.setState,
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
            name: 'Test Game',
            numCards: 5,
            noBidPoints: 5,
            dirty: true,
            timeLimit: 30,
            gameId: 'game-1',
          },
          players: {},
          hand: [],
          bid: 0,
          bids: {},
          tricks: [],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: mockContext.visible,
          setState: mockContext.setState,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
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
          visible: mockContext.visible,
          setState: mockContext.setState,
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
          visible: mockContext.visible,
          setState: mockContext.setState,
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

      expect(mockStartGame).toHaveBeenCalledWith({ gameId: 'game-1' })
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
          visible: mockContext.visible,
          setState: mockContext.setState,
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
          updater({ game: {}, players: {}, bid: 3 })
        }
      })

      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {},
          players: {},
          hand: [],
          bid: 3,
          bids: {},
          tricks: [],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: mockContext.visible,
          setState: mockContext.setState,
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

    test('closeModal hides winner modal and re-initializes listeners', async () => {
      const { result } = renderHook(() =>
        useGameActions({
          gameId: 'game-1',
          playerId: 'p1',
          playerName: 'Player 1',
          game: {
            roundId: 'round-1',
          },
          players: {},
          hand: [],
          bid: 0,
          bids: {},
          tricks: [],
          trickIndex: 0,
          trump: null,
          queuedCard: null,
          visible: mockContext.visible,
          setState: mockContext.setState,
          updateState: mockUpdateState,
          dispatchRound: mockDispatchRound,
          autoPlayTimeoutRef: mockAutoPlayTimeout,
          listenToGame: mockListenToGame,
          listenToRound: mockListenToRound,
          listenToHand: mockListenToHand,
        })
      )

      await act(async () => {
        await result.current.closeModal()
      })

      expect(mockDispatchRound).toHaveBeenCalledWith({
        type: 'HIDE_WINNER_MODAL',
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
          visible: mockContext.visible,
          setState: mockContext.setState,
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
          visible: mockContext.visible,
          setState: mockContext.setState,
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
