import type { Player, Card } from './types.js'
import type Deck from './deck.js'
import type { database } from 'firebase-admin'

/**
 * Deals cards from a deck to all players
 * @param deck - The deck to deal from
 * @param players - Array of players to deal to
 * @param numCards - Number of cards to deal to each player
 * @returns Record of playerIds to their dealt hands
 */
export const dealHandsToPlayers = (
  deck: Deck,
  players: Player[],
  numCards: number
): Record<string, Card[]> => {
  const hands: Record<string, Card[]> = {}
  for (let i = numCards; i > 0; i--) {
    players.forEach((player) => {
      const card = deck.deal()
      if (card) {
        hands[player.playerId] = [...(hands[player.playerId] ?? []), card]
      }
    })
  }
  return hands
}

/**
 * Writes dealt hands to the database update object
 * @param updateObj - The database update object to modify
 * @param ref - Firebase database reference function
 * @param gameId - The game ID
 * @param roundKey - The round key
 * @param hands - The hands to write
 * @param deck - The deck (for sorting hands)
 */
export const writeHandsToDatabase = (
  updateObj: Record<string, unknown>,
  ref: (path?: string) => database.Reference,
  gameId: string,
  roundKey: string,
  hands: Record<string, Card[]>,
  deck: Deck
): void => {
  Object.keys(hands).forEach((playerId) => {
    const hand = hands[playerId]
    const sortedHand = deck.sortHand(hand)
    sortedHand.forEach((card) => {
      const cardRef = ref(
        `games/${gameId}/players/${playerId}/hands/${roundKey}/cards`
      ).push()
      const cardId = cardRef.key as string
      updateObj[`games/${gameId}/players/${playerId}/hands/${roundKey}/cards/${cardId}`] =
        { ...card, cardId, playerId }
    })
  })
}

/**
 * Creates a new round and its first trick in the database
 * @param ref - Firebase database reference function
 * @param gameId - The game ID
 * @returns Object containing the roundKey and trickKey
 */
export const createRoundAndTrick = (
  ref: (path?: string) => database.Reference,
  gameId: string
): { roundKey: string; trickKey: string } => {
  const roundRef = ref(`games/${gameId}/rounds`).push()
  const roundKey = roundRef.key as string
  const trickRef = ref(`games/${gameId}/rounds/${roundKey}/tricks`).push()
  const trickKey = trickRef.key as string
  return { roundKey, trickKey }
}

/**
 * Computes the number of cards to deal for the next round and whether the game is
 * still descending. Handles the turnaround point where dealing switches from
 * decreasing to increasing card counts.
 * @param currentNumCards - The number of cards dealt in the current round (null if first advance)
 * @param defaultNumCards - The starting card count from game settings (used as fallback)
 * @param descending - Whether the game is currently in the descending phase
 * @returns The next numCards and descending values
 */
export const computeNextNumCards = (
  currentNumCards: number | null,
  defaultNumCards: number,
  descending: boolean
): { numCards: number; descending: boolean } => {
  const prevNumCards = currentNumCards ?? defaultNumCards
  let numCards = descending ? prevNumCards - 1 : prevNumCards + 1
  let newDescending = descending
  if (numCards < 1) {
    newDescending = false
    numCards = 2
  }
  return { numCards, descending: newDescending }
}

/**
 * Rebuilds the player order array, maintaining existing order and adding new players at the end
 * @param oldPlayerOrder - The previous player order
 * @param allPlayers - All current players in the game
 * @returns New player order array with only present players
 */
export const rebuildPlayerOrder = (
  oldPlayerOrder: string[],
  allPlayers: Player[]
): string[] => {
  const presentPlayers = allPlayers
    .filter((p) => p.present !== false)
    .sort((a, b) => {
      const aIndex = oldPlayerOrder.indexOf(a.playerId)
      const bIndex = oldPlayerOrder.indexOf(b.playerId)
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      return a.playerId.localeCompare(b.playerId)
    })
  return presentPlayers.map((p) => p.playerId)
}
