import { Card } from './card'
import { Player } from './game'

export interface NewGameRequest {
  game: string
  name: string
  numCards: number
  bidPoints: boolean
  dirty: boolean
  timeLimit: number | null
}

export interface NewGameResponse {
  playerId: string
  gameId: string
}

export interface AddPlayerRequest {
  gameId: string
  playerName: string
}

export interface AddPlayerResponse {
  playerId: string
}

export interface StartGameRequest {
  gameId: string
  players: Record<string, Player>
  numCards: number
}

export interface SubmitBidRequest {
  gameId: string
  playerId: string
  bid: number
  roundId: string
}

export interface PlayCardRequest {
  gameId: string
  playerId: string
  card: Card
  roundId: string
  trickId: string
}

export interface ReplayGameRequest {
  oldGameId: string
  newGameId: string
}

export interface UpdatePlayerRequest {
  playerId: string
  gameId: string
  present: boolean
}
