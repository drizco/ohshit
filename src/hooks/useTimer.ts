import { useEffect, useRef, useState } from 'react'
import useInterval from './useInterval'

interface UseTimerOptions {
  timeLimit: number | null
  turnStartedAt: number | null
  playerId: string
  currentPlayer: string
  randomPlay: () => void
}

function computeRemaining(
  timeLimit: number | null,
  turnStartedAt: number | null
): number | null {
  if (!timeLimit || !turnStartedAt) return null
  return Math.max(0, timeLimit - Math.floor((Date.now() - turnStartedAt) / 1000))
}

export function useTimer({
  timeLimit,
  turnStartedAt,
  playerId,
  currentPlayer,
  randomPlay,
}: UseTimerOptions): { timeRemaining: number | null } {
  const [syncedAt, setSyncedAt] = useState(turnStartedAt)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(() =>
    computeRemaining(timeLimit, turnStartedAt)
  )
  // Tracks which turnStartedAt was last fired for
  const firedForRef = useRef<number | null>(null)

  // React "store information from previous renders" pattern: setState during render
  // to sync timeRemaining when the turn changes, with no extra paint cycle.
  if (syncedAt !== turnStartedAt) {
    setSyncedAt(turnStartedAt)
    setTimeRemaining(computeRemaining(timeLimit, turnStartedAt))
  }

  // Tick every 500ms for responsive display
  useInterval(
    () => {
      const remaining = computeRemaining(timeLimit, turnStartedAt)
      setTimeRemaining(remaining)
    },
    timeLimit && turnStartedAt ? 500 : null
  )

  // Trigger randomPlay when time runs out. turnStartedAt is in deps so this
  // re-evaluates on every new turn even when timeRemaining is already 0.
  useEffect(() => {
    if (
      timeRemaining === 0 &&
      currentPlayer === playerId &&
      firedForRef.current !== turnStartedAt
    ) {
      firedForRef.current = turnStartedAt
      randomPlay()
    }
  }, [timeRemaining, currentPlayer, playerId, randomPlay, turnStartedAt])

  return { timeRemaining }
}
