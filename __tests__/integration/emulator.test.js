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
import { newGame, addPlayer } from '../../functions/game.js'

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
      expect(game.name).toBe('Integration Test Game')
      expect(game.status).toBe('pending')
      expect(game.numCards).toBe(10)

      // Verify player was created
      const playerSnapshot = await db.ref(`players/${playerId}`).once('value')
      const player = playerSnapshot.val()

      expect(player).toBeDefined()
      expect(player.name).toBe('Test Host')
      expect(player.host).toBe(true)
      expect(player.gameId).toBe(gameId)
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
      const playersSnapshot = await db
        .ref('players')
        .orderByChild('gameId')
        .equalTo(gameId)
        .once('value')

      const players = playersSnapshot.val()
      const playerArray = Object.values(players)

      expect(playerArray).toHaveLength(3)
      expect(playerArray.map((p) => p.name).sort()).toEqual([
        'Host Player',
        'Player 2',
        'Player 3',
      ])
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

      expect(game.status).toBe('pending')

      // 4. Get all players
      const playersSnapshot = await db
        .ref('players')
        .orderByChild('gameId')
        .equalTo(gameId)
        .once('value')

      const players = Object.values(playersSnapshot.val())
      expect(players).toHaveLength(2)
    })
  })
})
