// Shared types for Firebase Functions backend

export type Suit = 'C' | 'S' | 'H' | 'D'
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

export interface Card {
  suit: Suit
  rank: Rank
  value: string
  cardId?: string
  playerId?: string
}

export interface CardValue {
  rank: Rank
  value: string
}

export interface Player {
  playerId: string
  name: string
  host?: boolean
  present: boolean
}
