import type { Card, Game, Player, Trick, Suit } from '.'

/**
 * Shared types for game hooks
 */

/**
 * Local state for the game page (combines Firebase data + UI state)
 * This is distinct from Game.state which is the database GameState
 */
export interface LocalGameState {
  game: Game | null
  players: Record<string, Player>
  playerId: string | null
  playerName: string
  hand: Card[]
  bid: number
  showYourTurn: boolean
  queuedCard: Card | null
  lastWinner: string | null
  lastCompletedTrick: Trick | null
}

export type RoundAction =
  | {
      type: 'LOAD_INITIAL'
      tricks?: Trick[]
      bids?: Record<string, number>
      trump?: Suit | null
    }
  | { type: 'SET_TRICKS'; tricks: Trick[] }
  | { type: 'ADD_TRICK'; trick: Trick }
  | { type: 'UPDATE_TRICK'; trick: Trick }
  | { type: 'SET_BIDS'; bids: Record<string, number> }
  | { type: 'UPDATE_BID'; playerId: string; bidValue: number }
  | { type: 'SET_TRUMP'; trump: Suit | null }
  | { type: 'RESET' }
