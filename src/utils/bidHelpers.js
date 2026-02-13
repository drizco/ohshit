import { handleDirtyGame } from './helpers'

/**
 * Calculate the adjusted bid value based on dirty game rules.
 * In dirty games, the total bids cannot equal the number of cards.
 * This function auto-corrects the bid if needed.
 *
 * @param {number} currentBid - The current bid value
 * @param {Object} bids - All player bids
 * @param {Object} game - Game object with numCards and dirty properties
 * @param {Object} players - All players in the game
 * @param {boolean} increment - Whether to increment (true) or decrement (false) when adjusting
 * @returns {number} The adjusted bid value
 */
export function calculateAdjustedBid(currentBid, bids, game, players, increment = true) {
  if (!game) return currentBid

  const { numCards, dirty } = game
  let newBid = Number(currentBid)

  // Auto-correct bid if it violates dirty game rules
  while (dirty && !handleDirtyGame({ value: newBid, numCards, bids, players })) {
    newBid = increment ? newBid + 1 : newBid - 1
  }

  // Ensure bid is within valid range
  return newBid >= 0 && newBid <= numCards ? newBid : currentBid
}
