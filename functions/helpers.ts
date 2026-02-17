/**
 * Server-side game logic helpers
 * Copied from src/utils/helpers.ts to ensure consistent game logic
 */

import type { Suit, Card } from './types.js'

interface CalculateLeaderParams {
  cards: Card[]
  trump: Suit
  leadSuit: Suit
}

interface IsLegalParams {
  hand: Card[]
  card: Card
  leadSuit: Suit | null
}

/**
 * Determines which card is winning the trick
 */
export const calculateLeader = ({
  cards,
  trump,
  leadSuit,
}: CalculateLeaderParams): Card =>
  cards.sort((a, b) => {
    // Trump beats non-trump
    if (a.suit === trump && b.suit !== trump) {
      return -1
    }
    if (b.suit === trump && a.suit !== trump) {
      return 1
    }
    // Lead suit beats non-lead (if not trump)
    if (a.suit === leadSuit && b.suit !== leadSuit) {
      return -1
    }
    if (b.suit === leadSuit && a.suit !== leadSuit) {
      return 1
    }
    // Higher rank wins
    return b.rank - a.rank
  })[0]

/**
 * Checks if a card is legal to play given the current hand and lead suit
 */
export const isLegal = ({ hand, card, leadSuit }: IsLegalParams): boolean => {
  if (!leadSuit) return true
  const hasSuit = hand.some((c) => c.suit === leadSuit)
  if (hasSuit) {
    return card.suit === leadSuit
  }
  return true
}
