import functions from 'firebase-functions'
import express from 'express'
import cors from 'cors'
import admin from 'firebase-admin'
import {
  addPlayer,
  startGame,
  replayGame,
  submitBid,
  playCard,
  nextRound,
  newGame,
  updatePlayer,
} from './game.js'

admin.initializeApp()

// Use emulator in development
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9000'
}

const ref = (path) => (path ? admin.database().ref(path) : admin.database().ref())

const app = express()

app.use(cors({ origin: true }))

app.use((req, res, next) => {
  req.ref = ref
  next()
})

// Authentication middleware - require valid token
app.use(async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing auth token' })
  }

  const token = authHeader.substring(7)

  try {
    const decodedToken = await admin.auth().verifyIdToken(token)
    req.uid = decodedToken.uid
    return next()
  } catch (error) {
    console.error('Error verifying auth token:', error)
    return res.status(401).json({ error: 'Unauthorized: Invalid auth token' })
  }
})

app.post('/add-player', addPlayer)
app.post('/new-game', newGame)
app.post('/start-game', startGame)
app.post('/replay-game', replayGame)
app.post('/submit-bid', submitBid)
app.post('/play-card', playCard)
app.post('/next-round', nextRound)
app.put('/update-player/:playerId/:gameId/:present', updatePlayer)

export const api = functions.https.onRequest(app)

export const clearOldGameData = functions.pubsub
  .schedule('0 0 * * 1')
  .timeZone('America/Denver')
  .onRun(async (context) => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    const gameSnap = await ref('games')
      .orderByChild('timestamp')
      .endAt(date.toISOString())
      .once('value')

    if (gameSnap.exists()) {
      console.log(`DELETING ${gameSnap.numChildren()} OLD GAMES`)

      const promiseArray = []
      gameSnap.forEach((snap) => {
        const game = snap.val()
        const gameId = snap.key
        promiseArray.push(
          ref(`hands`)
            .orderByChild('gameId')
            .equalTo(gameId)
            .once('value')
            .then((snap) => snap.ref.remove()),
          ref(`players`)
            .orderByChild('gameId')
            .equalTo(gameId)
            .once('value')
            .then((snap) => snap.ref.remove()),
          ref(`rounds`)
            .orderByChild('gameId')
            .equalTo(gameId)
            .once('value')
            .then((snap) => snap.ref.remove()),
          snap.ref.remove()
        )
      })
      await Promise.all(promiseArray)
    } else {
      console.log('NO OLD GAMES TO DELETE')
    }

    return null
  })
