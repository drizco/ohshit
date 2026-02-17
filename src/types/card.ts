export type Suit = 'C' | 'S' | 'H' | 'D'

export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

export interface Card {
  suit: Suit
  rank: Rank
  value: string // '2'-'10', 'J', 'Q', 'K', 'A'
  cardId?: string // Optional, added when in player's hand
  playerId?: string // Optional, added when played in trick
}
