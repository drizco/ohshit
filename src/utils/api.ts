import { auth } from '../lib/firebase'
import { onAuthStateChanged, signInAnonymously, signOut, User } from 'firebase/auth'
import type {
  StartGameRequest,
  PlayCardRequest,
  SubmitBidRequest,
  NewGameRequest,
  AddPlayerRequest,
  ReplayGameRequest,
  UpdatePlayerRequest,
} from '../types/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_CLOUD_FUNCTION_URL

// Wait for auth to be ready
const waitForAuth = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

const getAuthHeaders = async (forceRefresh = false): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  try {
    // Wait for auth if currentUser is null
    let user = auth.currentUser
    if (!user) {
      user = await waitForAuth()
    }

    if (user) {
      // Force refresh will get a new token from Firebase
      const token = await user.getIdToken(forceRefresh)
      headers.Authorization = `Bearer ${token}`
    } else if (forceRefresh) {
      // If no user and forcing refresh, sign in anonymously
      const result = await signInAnonymously(auth)
      if (result.user) {
        const token = await result.user.getIdToken()
        headers.Authorization = `Bearer ${token}`
      }
    }
  } catch (error) {
    console.error('Error getting auth token:', error)
  }

  return headers
}

// Helper to make authenticated requests with automatic retry on 401
const authenticatedFetch = async (
  url: string,
  options: RequestInit,
  retryCount = 0
): Promise<Response> => {
  const response = await fetch(url, options)

  // If 401 and we haven't retried yet, sign out and sign back in
  if (response.status === 401 && retryCount === 0) {
    console.log('Got 401, signing out and creating new session...')

    try {
      // Sign out the old (revoked) user and sign in as a new anonymous user
      await signOut(auth)
      await signInAnonymously(auth)

      // Get fresh headers with the new user's token
      const newHeaders = await getAuthHeaders(false)

      // Retry the request with new headers
      return authenticatedFetch(url, { ...options, headers: newHeaders }, retryCount + 1)
    } catch (error) {
      console.error('Error refreshing authentication:', error)
    }
  }

  return response
}

export const startGame = async ({
  gameId,
  players,
  numCards,
}: StartGameRequest): Promise<Response> =>
  authenticatedFetch(`${API_BASE_URL}/start-game`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ gameId, players, numCards }),
  })

export const playCard = async (body: PlayCardRequest): Promise<Response> =>
  authenticatedFetch(`${API_BASE_URL}/play-card`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  })

export const submitBid = async (body: SubmitBidRequest): Promise<Response> =>
  authenticatedFetch(`${API_BASE_URL}/submit-bid`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  })

export const newGame = async (body: NewGameRequest): Promise<Response> =>
  authenticatedFetch(`${API_BASE_URL}/new-game`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  })

export const addPlayer = async (body: AddPlayerRequest): Promise<Response> =>
  authenticatedFetch(`${API_BASE_URL}/add-player`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  })

export const replayGame = async (body: ReplayGameRequest): Promise<Response> =>
  authenticatedFetch(`${API_BASE_URL}/replay-game`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  })

export const updatePlayer = async ({
  playerId,
  gameId,
  present,
}: UpdatePlayerRequest): Promise<Response> =>
  authenticatedFetch(`${API_BASE_URL}/update-player/${playerId}/${gameId}/${present}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
  })
