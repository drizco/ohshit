// Unit tests for Firebase game functions
import { jest } from '@jest/globals'
import {
  newGame,
  addPlayer,
  submitBid,
  replayGame,
  updatePlayer,
} from '../../functions/game'

// Mock the deck
jest.mock('../../functions/deck')

describe('Game Functions - newGame', () => {
  let mockRef
  let mockReq
  let mockRes

  beforeEach(() => {
    // Create mock database reference
    const mockPush = {
      key: 'player-123',
      set: jest.fn(() => Promise.resolve()),
    }

    mockRef = jest.fn(() => ({
      once: jest.fn(() =>
        Promise.resolve({
          exists: () => false, // Game ID is unique
          val: () => null,
        })
      ),
      update: jest.fn(() => Promise.resolve()),
      push: jest.fn(() => mockPush),
    }))

    mockReq = {
      ref: mockRef,
      body: {
        game: 'Test Game',
        name: 'Test Player',
        numCards: 10,
        bidPoints: 1,
        dirty: false,
        timeLimit: 60,
      },
    }

    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      sendStatus: jest.fn().mockReturnThis(),
    }
  })

  test('should create a new game with valid parameters', async () => {
    await newGame(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.send).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: expect.any(String),
        gameId: expect.any(String),
      })
    )
  })

  test('should create game with correct status', async () => {
    const mockUpdate = jest.fn(() => Promise.resolve())
    mockRef.mockImplementation(() => ({
      once: jest.fn(() =>
        Promise.resolve({
          exists: () => false,
          val: () => null,
        })
      ),
      update: mockUpdate,
      push: jest.fn(() => ({ key: 'player-123' })),
    }))

    await newGame(mockReq, mockRes)

    expect(mockUpdate).toHaveBeenCalled()
    const updateArg = mockUpdate.mock.calls[0][0]
    const statusKey = Object.keys(updateArg).find((key) => key.endsWith('/status'))
    expect(updateArg[statusKey]).toBe('pending')
  })

  test('should handle bidPoints flag correctly', async () => {
    const mockUpdate = jest.fn(() => Promise.resolve())
    mockRef.mockImplementation(() => ({
      once: jest.fn(() =>
        Promise.resolve({
          exists: () => false,
        })
      ),
      update: mockUpdate,
      push: jest.fn(() => ({ key: 'player-123' })),
    }))

    // Test with bidPoints = 1 (should set noBidPoints to false)
    await newGame(mockReq, mockRes)
    const updateArg1 = mockUpdate.mock.calls[0][0]
    const noBidPointsKey1 = Object.keys(updateArg1).find((key) =>
      key.endsWith('/noBidPoints')
    )
    expect(updateArg1[noBidPointsKey1]).toBe(false)

    // Test with bidPoints = 0 (should set noBidPoints to true)
    mockReq.body.bidPoints = 0
    await newGame(mockReq, mockRes)
    const updateArg2 = mockUpdate.mock.calls[1][0]
    const noBidPointsKey2 = Object.keys(updateArg2).find((key) =>
      key.endsWith('/noBidPoints')
    )
    expect(updateArg2[noBidPointsKey2]).toBe(true)
  })

  test('should handle errors and return 500', async () => {
    mockRef.mockImplementation(() => ({
      once: jest.fn(() => Promise.reject(new Error('Database error'))),
    }))

    await newGame(mockReq, mockRes)

    expect(mockRes.sendStatus).toHaveBeenCalledWith(500)
  })
})

describe('Game Functions - addPlayer', () => {
  let mockRef
  let mockReq
  let mockRes

  beforeEach(() => {
    const mockPush = {
      key: 'new-player-id',
      update: jest.fn(() => Promise.resolve()),
    }

    mockRef = jest.fn((path) => {
      if (path === 'games/TEST/state') {
        return {
          once: jest.fn(() =>
            Promise.resolve({
              val: () => ({ status: 'pending' }),
            })
          ),
        }
      }
      return {
        push: jest.fn(() => mockPush),
      }
    })

    mockReq = {
      ref: mockRef,
      body: {
        playerName: 'New Player',
        gameId: 'TEST',
      },
    }

    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      sendStatus: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
  })

  test('should add a new player to the game', async () => {
    await addPlayer(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.send).toHaveBeenCalledWith({
      playerId: 'new-player-id',
    })
  })

  test('should set present flag to true', async () => {
    const mockPushUpdate = jest.fn(() => Promise.resolve())
    mockRef.mockImplementation((path) => {
      if (path === 'games/TEST/state') {
        return {
          once: jest.fn(() =>
            Promise.resolve({
              val: () => ({ status: 'pending' }),
            })
          ),
        }
      }
      return {
        push: () => ({
          key: 'new-player-id',
          update: mockPushUpdate,
        }),
      }
    })

    await addPlayer(mockReq, mockRes)

    expect(mockPushUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        present: true,
      })
    )
  })

  test('should return 404 when game does not exist', async () => {
    mockRef.mockImplementation((path) => {
      if (path === 'games/TEST/state') {
        return {
          once: jest.fn(() =>
            Promise.resolve({
              val: () => null,
            })
          ),
        }
      }
      return {
        push: jest.fn(),
      }
    })

    await addPlayer(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(404)
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Game not found' })
  })

  test('should return 400 when game is over', async () => {
    mockRef.mockImplementation((path) => {
      if (path === 'games/TEST/state') {
        return {
          once: jest.fn(() =>
            Promise.resolve({
              val: () => ({ status: 'over' }),
            })
          ),
        }
      }
      return {
        push: jest.fn(),
      }
    })

    await addPlayer(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Game has ended' })
  })

  test('should allow joining games in bid, play, or pending status', async () => {
    const statuses = ['pending', 'bid', 'play']

    for (const status of statuses) {
      jest.clearAllMocks()

      const mockPushUpdate = jest.fn(() => Promise.resolve())
      mockRef.mockImplementation((path) => {
        if (path === 'games/TEST/state') {
          return {
            once: jest.fn(() =>
              Promise.resolve({
                val: () => ({ status }),
              })
            ),
          }
        }
        return {
          push: () => ({
            key: 'new-player-id',
            update: mockPushUpdate,
          }),
        }
      })

      await addPlayer(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(200)
    }
  })

  test('should handle errors', async () => {
    mockRef.mockImplementation(() => ({
      once: jest.fn(() => Promise.reject(new Error('Database error'))),
    }))

    await addPlayer(mockReq, mockRes)

    expect(mockRes.sendStatus).toHaveBeenCalledWith(500)
  })
})

describe('Game Functions - submitBid', () => {
  let mockRef
  let mockReq
  let mockRes
  let mockUpdate

  beforeEach(() => {
    mockUpdate = jest.fn(() => Promise.resolve())

    // Mock ref to return different values based on path
    mockRef = jest.fn((path) => {
      if (path === 'games/TEST/state/playerOrder') {
        return {
          once: jest.fn(() =>
            Promise.resolve({ val: () => ['player-1', 'player-2', 'player-3'] })
          ),
        }
      }
      if (path === 'games/TEST/state/currentPlayerIndex') {
        return {
          once: jest.fn(() => Promise.resolve({ val: () => 0 })),
        }
      }
      if (path === 'games/TEST/rounds/round-1/bids') {
        return {
          once: jest.fn(() => Promise.resolve({ val: () => ({}) })),
        }
      }
      // Default case - ref() with no args
      return { update: mockUpdate }
    })

    mockReq = {
      ref: mockRef,
      body: {
        playerId: 'player-1',
        bid: 3,
        gameId: 'TEST',
        roundId: 'round-1',
      },
    }

    mockRes = {
      sendStatus: jest.fn(),
      status: jest.fn(() => mockRes),
      json: jest.fn(),
    }
  })

  test('should submit a bid successfully', async () => {
    await submitBid(mockReq, mockRes)

    expect(mockRes.sendStatus).toHaveBeenCalledWith(200)
  })

  test('should convert bid to number', async () => {
    mockReq.body.bid = '5'
    await submitBid(mockReq, mockRes)

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        'games/TEST/rounds/round-1/bids/player-1': 5,
      })
    )
  })

  test('should change status to play when all bids are in', async () => {
    // Mock bids to show 2 players have already bid (player-2 and player-3)
    mockRef.mockImplementation((path) => {
      if (path === 'games/TEST/state/playerOrder') {
        return {
          once: jest.fn(() =>
            Promise.resolve({ val: () => ['player-1', 'player-2', 'player-3'] })
          ),
        }
      }
      if (path === 'games/TEST/state/currentPlayerIndex') {
        return {
          once: jest.fn(() => Promise.resolve({ val: () => 0 })),
        }
      }
      if (path === 'games/TEST/rounds/round-1/bids') {
        return {
          once: jest.fn(() =>
            Promise.resolve({ val: () => ({ 'player-2': 2, 'player-3': 1 }) })
          ),
        }
      }
      return { update: mockUpdate }
    })

    await submitBid(mockReq, mockRes)

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        'games/TEST/state/status': 'play',
      })
    )
  })

  test('should not change status when not all bids are in', async () => {
    await submitBid(mockReq, mockRes)

    const updateArg = mockUpdate.mock.calls[0][0]
    expect(updateArg['games/TEST/state/status']).toBeUndefined()
  })

  test('should handle errors', async () => {
    mockRef.mockImplementation(() => ({
      update: jest.fn(() => Promise.reject(new Error('Database error'))),
    }))

    await submitBid(mockReq, mockRes)

    expect(mockRes.sendStatus).toHaveBeenCalledWith(500)
  })
})

describe('Game Functions - updatePlayer', () => {
  let mockRef
  let mockReq
  let mockRes

  beforeEach(() => {
    mockRef = jest.fn(() => ({
      update: jest.fn(() => Promise.resolve()),
    }))

    mockReq = {
      ref: mockRef,
      params: {
        playerId: 'player-1',
        gameId: 'TEST',
        present: 'true',
      },
    }

    mockRes = {
      sendStatus: jest.fn(),
    }
  })

  test('should update player presence to true', async () => {
    const mockUpdate = jest.fn(() => Promise.resolve())
    mockRef.mockImplementation(() => ({ update: mockUpdate }))

    await updatePlayer(mockReq, mockRes)

    expect(mockUpdate).toHaveBeenCalledWith({
      present: true,
    })
    expect(mockRes.sendStatus).toHaveBeenCalledWith(200)
  })

  test('should update player presence to false', async () => {
    const mockUpdate = jest.fn(() => Promise.resolve())
    mockRef.mockImplementation(() => ({ update: mockUpdate }))

    mockReq.params.present = 'false'
    await updatePlayer(mockReq, mockRes)

    expect(mockUpdate).toHaveBeenCalledWith({
      present: false,
    })
  })

  test('should handle errors', async () => {
    mockRef.mockImplementation(() => ({
      update: jest.fn(() => Promise.reject(new Error('Database error'))),
    }))

    await updatePlayer(mockReq, mockRes)

    expect(mockRes.sendStatus).toHaveBeenCalledWith(500)
  })
})

describe('Game Functions - replayGame', () => {
  let mockRef
  let mockReq
  let mockRes

  beforeEach(() => {
    mockRef = jest.fn(() => ({
      update: jest.fn(() => Promise.resolve()),
    }))

    mockReq = {
      ref: mockRef,
      body: {
        oldGameId: 'OLD',
        newGameId: 'NEW',
      },
    }

    mockRes = {
      sendStatus: jest.fn(),
    }
  })

  test('should link old game to new game', async () => {
    const mockUpdate = jest.fn(() => Promise.resolve())
    mockRef.mockImplementation(() => ({ update: mockUpdate }))

    await replayGame(mockReq, mockRes)

    expect(mockUpdate).toHaveBeenCalledWith({ nextGame: 'NEW' })
    expect(mockRes.sendStatus).toHaveBeenCalledWith(200)
  })

  test('should handle errors', async () => {
    mockRef.mockImplementation(() => ({
      update: jest.fn(() => Promise.reject(new Error('Database error'))),
    }))

    await replayGame(mockReq, mockRes)

    expect(mockRes.sendStatus).toHaveBeenCalledWith(500)
  })
})
