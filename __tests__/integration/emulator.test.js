/**
 * Integration tests using Firebase Emulator
 *
 * These tests require the Firebase emulator to be running:
 * npm run emulator (in functions directory)
 *
 * Run these tests separately with:
 * yarn test:integration
 */

import { jest } from '@jest/globals'
import admin from 'firebase-admin'
import { newGame, addPlayer } from '../../functions/game'

// Only run these tests if FIREBASE_EMULATOR environment variable is set
const describeIfEmulator = process.env.FIREBASE_EMULATOR ? describe : describe.skip

describeIfEmulator('Firebase Emulator Integration Tests', () => {
  let db

  beforeAll(() => {
    // Initialize Firebase Admin with emulator settings
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: 'demo-oopsie-poopsie',
        databaseURL: 'http://localhost:9000?ns=demo-oopsie-poopsie',
      })
    }
    db = admin.database()
  })

  afterAll(async () => {
    // Cleanup
    await admin.app().delete()
  })

  beforeEach(async () => {
    // Clear database before each test
    await db.ref().set(null)
  })

  describe('newGame integration', () => {
    test('should create a complete game in the database', async () => {
      const req = {
        ref: db.ref.bind(db),
        uid: 'test-uid-1',
        body: {
          game: 'Integration Test Game',
          name: 'Test Host',
          numCards: 10,
          bidPoints: 1,
          dirty: false,
          timeLimit: 60,
        },
      }

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        sendStatus: jest.fn().mockReturnThis(),
      }

      await newGame(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.send).toHaveBeenCalled()

      const { gameId, playerId } = res.send.mock.calls[0][0]

      // Verify game was created in database
      const gameSnapshot = await db.ref(`games/${gameId}`).once('value')
      const game = gameSnapshot.val()

      expect(game).toBeDefined()
      expect(game.metadata.name).toBe('Integration Test Game')
      expect(game.state.status).toBe('pending')
      expect(game.settings.numCards).toBe(10)

      // Verify player was created
      const playerSnapshot = await db
        .ref(`games/${gameId}/players/${playerId}`)
        .once('value')
      const player = playerSnapshot.val()

      expect(player).toBeDefined()
      expect(player.name).toBe('Test Host')
      expect(player.host).toBe(true)
      expect(player.playerId).toBe(playerId)
    })
  })

  describe('addPlayer integration', () => {
    test('should add multiple players to a game', async () => {
      // First create a game
      const newGameReq = {
        ref: db.ref.bind(db),
        uid: 'test-uid-host',
        body: {
          game: 'Multiplayer Test',
          name: 'Host Player',
          numCards: 7,
          bidPoints: 1,
          dirty: false,
          timeLimit: 45,
        },
      }

      const newGameRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        sendStatus: jest.fn().mockReturnThis(),
      }

      await newGame(newGameReq, newGameRes)
      const { gameId } = newGameRes.send.mock.calls[0][0]

      // Now add two more players
      const player2Req = {
        ref: db.ref.bind(db),
        uid: 'test-uid-player2',
        body: {
          playerName: 'Player 2',
          gameId,
        },
      }

      const player2Res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        sendStatus: jest.fn().mockReturnThis(),
      }

      await addPlayer(player2Req, player2Res)

      const player3Req = {
        ref: db.ref.bind(db),
        uid: 'test-uid-player3',
        body: {
          playerName: 'Player 3',
          gameId,
        },
      }

      const player3Res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        sendStatus: jest.fn().mockReturnThis(),
      }

      await addPlayer(player3Req, player3Res)

      // Verify all players exist
      const playersSnapshot = await db.ref(`games/${gameId}/players`).once('value')

      const players = playersSnapshot.val()
      const playerArray = players ? Object.values(players) : []

      expect(playerArray).toHaveLength(3)
      expect(playerArray.map((p) => p.name).sort()).toEqual([
        'Host Player',
        'Player 2',
        'Player 3',
      ])
    })

    test('should return 404 when trying to join non-existent game', async () => {
      const req = {
        ref: db.ref.bind(db),
        uid: 'test-uid-player',
        body: {
          playerName: 'Test Player',
          gameId: 'NON_EXISTENT_GAME',
        },
      }

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        sendStatus: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      }

      await addPlayer(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: 'Game not found' })
    })

    test('should return 400 when trying to join game that is over', async () => {
      // Create a game
      const createRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        sendStatus: jest.fn().mockReturnThis(),
      }

      await newGame(
        {
          ref: db.ref.bind(db),
          uid: 'test-uid-host',
          body: {
            game: 'Finished Game',
            name: 'Host',
            numCards: 5,
            bidPoints: 1,
            dirty: false,
            timeLimit: 30,
          },
        },
        createRes
      )

      const { gameId } = createRes.send.mock.calls[0][0]

      // Manually set game status to 'over'
      await db.ref(`games/${gameId}/state/status`).set('over')

      // Try to join the game
      const joinRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        sendStatus: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      }

      await addPlayer(
        {
          ref: db.ref.bind(db),
          uid: 'test-uid-late-player',
          body: {
            playerName: 'Late Player',
            gameId,
          },
        },
        joinRes
      )

      expect(joinRes.status).toHaveBeenCalledWith(400)
      expect(joinRes.json).toHaveBeenCalledWith({ error: 'Game has ended' })
    })
  })

  describe('Full game flow integration', () => {
    test('should handle game creation, players joining, and starting', async () => {
      // 1. Create game
      const createRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        sendStatus: jest.fn().mockReturnThis(),
      }

      await newGame(
        {
          ref: db.ref.bind(db),
          uid: 'test-uid-flow-host',
          body: {
            game: 'Flow Test',
            name: 'Host',
            numCards: 5,
            bidPoints: 1,
            dirty: false,
            timeLimit: 30,
          },
        },
        createRes
      )

      const { gameId } = createRes.send.mock.calls[0][0]

      // 2. Add second player
      const addRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        sendStatus: jest.fn().mockReturnThis(),
      }

      await addPlayer(
        {
          ref: db.ref.bind(db),
          uid: 'test-uid-flow-player2',
          body: {
            playerName: 'Player 2',
            gameId,
          },
        },
        addRes
      )

      // 3. Verify game state
      const gameSnapshot = await db.ref(`games/${gameId}`).once('value')
      const game = gameSnapshot.val()

      expect(game.state.status).toBe('pending')

      // 4. Get all players
      const playersSnapshot = await db.ref(`games/${gameId}/players`).once('value')

      const playersVal = playersSnapshot.val()
      const players = playersVal ? Object.values(playersVal) : []
      expect(players).toHaveLength(2)
    })
  })
})
