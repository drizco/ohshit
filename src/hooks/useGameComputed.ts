import { useMemo } from 'react'
import { getScore } from '../utils/helpers'
import type { Trick, Player } from '../types'

interface UseGameComputedOptions {
  tricks?: Trick[]
  players?: Record<string, Player>
  playerId?: string | null
}

/**
 * Custom hook for computed/derived values from game state
 */
const useGameComputed = ({ tricks = [], players = {}, playerId = null }: UseGameComputedOptions) => {
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
