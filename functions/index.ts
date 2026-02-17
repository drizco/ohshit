import functions from 'firebase-functions'
import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import admin from 'firebase-admin'
import type { database } from 'firebase-admin'
import {
  addPlayer,
  startGame,
  replayGame,
  submitBid,
  playCard,
  newGame,
  updatePlayer,
} from './game.js'

// Extend Express Request to include custom properties
interface RequestWithAuth extends Request {
  ref: (path?: string) => database.Reference
  uid?: string
}

// Use emulator in development - MUST be set BEFORE admin.initializeApp()
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9000'
}

admin.initializeApp()

const ref = (path?: string): database.Reference =>
  path ? admin.database().ref(path) : admin.database().ref()

const app = express()

app.use(cors({ origin: true }))

app.use((req: Request, _res: Response, next: NextFunction) => {
  ;(req as RequestWithAuth).ref = ref
  next()
})

// Authentication middleware - require valid token
app.use(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing auth token' })
  }

  const token = authHeader.substring(7)

  try {
    const decodedToken = await admin.auth().verifyIdToken(token)
    ;(req as RequestWithAuth).uid = decodedToken.uid
    return next()
  } catch (error) {
    console.error('Error verifying auth token:', error)
    return res.status(401).json({ error: 'Unauthorized: Invalid auth token' })
  }
})

// Type assertion via unknown - Express/Firebase Functions have incompatible handler signatures
// but are compatible at runtime. The handlers use RequestWithAuth which extends Request.
app.post('/add-player', addPlayer as unknown as express.RequestHandler)
app.post('/new-game', newGame as unknown as express.RequestHandler)
app.post('/start-game', startGame as unknown as express.RequestHandler)
app.post('/replay-game', replayGame as unknown as express.RequestHandler)
app.post('/submit-bid', submitBid as unknown as express.RequestHandler)
app.post('/play-card', playCard as unknown as express.RequestHandler)
app.put(
  '/update-player/:playerId/:gameId/:present',
  updatePlayer as unknown as express.RequestHandler
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const api = functions.https.onRequest(app as any)

export const clearOldGameData = functions.pubsub
  .schedule('0 0 * * 1')
  .timeZone('America/Denver')
  .onRun(async (_context) => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    const gameSnap = await ref('games')
      .orderByChild('metadata/timestamp')
      .endAt(date.toISOString())
      .once('value')

    if (gameSnap.exists()) {
      console.log(`DELETING ${gameSnap.numChildren()} OLD GAMES`)

      const promiseArray: Promise<void>[] = []
      gameSnap.forEach((snap) => {
        // With nested schema, deleting game node removes everything:
        // players, rounds, tricks, bids, hands all cascade
        promiseArray.push(snap.ref.remove())
      })
      await Promise.all(promiseArray)
    } else {
      console.log('NO OLD GAMES TO DELETE')
    }

    return null
  })
