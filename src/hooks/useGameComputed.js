import { useMemo } from 'react'
import { getScore } from '../utils/helpers'

/**
 * Custom hook for computed/derived values from game state
 *
 * @param {Object} options
 * @param {Array} options.tricks - Array of trick objects
 * @param {Object} options.players - Object mapping playerId to player data
 * @param {string} options.playerId - Current player's ID
 * @returns {Object} Computed values: { trickIndex, roundScore, isHost, winner, trick, leadSuit }
 */
const useGameComputed = ({ tricks = [], players = {}, playerId = null }) => {
  // Calculate the index of the current trick (most recent)
  const trickIndex = useMemo(() => {
    return tricks.length > 0 ? tricks.length - 1 : 0
  }, [tricks])

  // Calculate round score from tricks
  const roundScore = useMemo(() => {
    return getScore(tricks)
  }, [tricks])

  // Determine if current player is the host
  const isHost = useMemo(() => {
    return playerId && players[playerId]?.host
  }, [playerId, players])

  // Get the current trick
  const trick = useMemo(() => {
    if (!tricks || tricks.length === 0 || trickIndex === undefined) {
      return null
    }
    return tricks[trickIndex] || null
  }, [tricks, trickIndex])

  // Get the winner of the current trick
  const winner = useMemo(() => {
    return trick?.winner
  }, [trick])

  // Get the lead suit of the current trick
  const leadSuit = useMemo(() => {
    return trick?.leadSuit
  }, [trick])

  return {
    trickIndex,
    roundScore,
    isHost,
    winner,
    trick,
    leadSuit,
  }
}

export default useGameComputed
