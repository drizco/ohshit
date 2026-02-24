import { Card, Suit } from './card'

export interface Player {
  playerId: string
  name: string
  host?: boolean
  present: boolean
  score?: number // Total game score
  hands?: Record<string, { cards: Record<string, Card> }> // roundId -> hand data
}

export interface Trick {
  trickId: string
  cards: Record<string, Card> // playerId -> Card
  winner?: string // playerId
  leadSuit?: Suit
  leader?: string // playerId who is currently leading
}

export interface Round {
  roundId: string
  tricks: Record<string, Trick>
  bids: Record<string, number> // playerId -> bid amount
  trump: Suit
  numCards: number
}

export type GameStatus = 'pending' | 'bid' | 'play' | 'over'

export interface GameState {
  status: GameStatus
  roundId?: string
  currentPlayerIndex: number
  playerOrder: string[] // Array of playerIds
  numPlayers: number // Number of players in game
  descending: boolean // Whether rounds are descending (fewer cards) or ascending
  nextGame?: string // For replay
  dealerIndex?: number // Current dealer index
  roundNum?: number // Current round number
  numRounds?: number // Total rounds in game
  numCards?: number // Cards per hand in current round (added during advanceToNextRound)
  turnStartedAt?: number // Server timestamp (ms since epoch) when current turn began
}

export interface GameSettings {
  numCards: number
  dirty: boolean
  timeLimit: number | null
  noBidPoints: boolean
}

export interface GameMetadata {
  gameId: string
  name: string
  timestamp: number
}

export interface Game {
  metadata: GameMetadata
  settings: GameSettings
  state: GameState
  players: Record<string, Player>
  rounds?: Record<string, Round>
}
