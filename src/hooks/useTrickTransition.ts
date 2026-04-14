import { useState, useCallback, useRef, useEffect } from 'react'
import type { RefObject } from 'react'
import type { Trick } from '../types'

// How long to wait after Firebase delivers a trick winner before showing the modal.
// Slightly longer than the max card animation (600ms flight + 250ms settle = 850ms).
const WINNER_MODAL_DELAY = 1500

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TrickTransitionState {
  /** Completed trick to show in Players while animating. null = show live trick. */
  displayedTrick: Trick | null
  /** Bids + round score snapshotted at trick-completion time. null = show live values. */
  snapshot: { bids: Record<string, number>; roundScore: Record<string, number> } | null
  /** Winner name — set when the modal opens, kept alive through the exit animation. */
  winner: string | null
  /** Controls Dialog open prop. Set false by closeModal; content stays until onModalExited. */
  modalOpen: boolean
}

const IDLE: TrickTransitionState = {
  displayedTrick: null,
  snapshot: null,
  winner: null,
  modalOpen: false,
}

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseTrickTransitionOptions {
  reducedMotion: boolean
  bidsRef: RefObject<Record<string, number>>
  roundScoreRef: RefObject<Record<string, number>>
}

function useTrickTransition({
  reducedMotion,
  bidsRef,
  roundScoreRef,
}: UseTrickTransitionOptions) {
  const [transitionState, setTransitionState] = useState<TrickTransitionState>(IDLE)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onTrickWon = useCallback(
    (winner: string, completedTrick: Trick) => {
      const bids = bidsRef.current ?? {}
      const roundScore = roundScoreRef.current ?? {}
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      // Immediately: lock in the completed trick and round data so the UI
      // keeps displaying them while animations play.
      setTransitionState({
        ...IDLE,
        displayedTrick: completedTrick,
        snapshot: { bids, roundScore },
      })

      const delay = reducedMotion ? 0 : WINNER_MODAL_DELAY
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        setTransitionState((prev) => ({
          ...prev,
          winner,
          modalOpen: true,
        }))
      }, delay)
    },
    [reducedMotion, bidsRef, roundScoreRef]
  )

  // Start closing: dialog begins exit animation, content stays intact.
  const closeModal = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setTransitionState((prev) => ({ ...prev, modalOpen: false }))
  }, [])

  // Called from Dialog's onExited — fires after exit animation completes.
  const onModalExited = useCallback(() => {
    setTransitionState(IDLE)
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { transitionState, onTrickWon, closeModal, onModalExited }
}

export default useTrickTransition
