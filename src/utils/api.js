import { auth } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

const API_BASE_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5001/demo-oopsie-poopsie/us-central1/api'
    : 'https://us-central1-oh-shit-ac7c3.cloudfunctions.net/api'

// Wait for auth to be ready
const waitForAuth = () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

const getAuthHeaders = async () => {
  const headers = {
    'Content-Type': 'application/json',
  }

  try {
    // Wait for auth if currentUser is null
    let user = auth.currentUser
    if (!user) {
      user = await waitForAuth()
    }

    if (user) {
      const token = await user.getIdToken()
      headers.Authorization = `Bearer ${token}`
    }
  } catch (error) {
    console.error('Error getting auth token:', error)
  }

  return headers
}

export const startGame = async ({ gameId, players, numCards }) =>
  fetch(`${API_BASE_URL}/start-game`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ gameId, players, numCards }),
  })

export const playCard = async (body) =>
  fetch(`${API_BASE_URL}/play-card`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  })

export const nextRound = async (body) =>
  fetch(`${API_BASE_URL}/next-round`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  })

export const submitBid = async (body) =>
  fetch(`${API_BASE_URL}/submit-bid`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  })

export const newGame = async (body) =>
  fetch(`${API_BASE_URL}/new-game`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  })

export const addPlayer = async (body) =>
  fetch(`${API_BASE_URL}/add-player`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  })

export const replayGame = async (body) =>
  fetch(`${API_BASE_URL}/replay-game`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  })

export const updatePlayer = async ({ playerId, gameId, present }) =>
  fetch(`${API_BASE_URL}/update-player/${playerId}/${gameId}/${present}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
  })
