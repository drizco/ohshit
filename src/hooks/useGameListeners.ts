import { useCallback, useRef, useMemo } from 'react'
import type { Dispatch } from 'react'
import type { DataSnapshot } from 'firebase/database'
import { ref } from 'firebase/database'
import { db } from '../lib/firebase'
import useFirebaseListener from './useFirebaseListener'
import { calculateAdjustedBid } from '../utils/bidHelpers'
import type { Card, Game, Player, LocalGameState, RoundAction } from '../types'

type FirebaseEventType = 'value' | 'child_added' | 'child_changed' | 'child_removed'

const CHILD_ADDED: FirebaseEventType = 'child_added'
const CHILD_CHANGED: FirebaseEventType = 'child_changed'
const CHILD_REMOVED: FirebaseEventType = 'child_removed'
const VALUE: FirebaseEventType = 'value'
const ADDED_OR_CHANGED: FirebaseEventType[] = [CHILD_ADDED, CHILD_CHANGED]

interface UseGameListenersOptions {
  gameId: string
  playerId: string | null
  roundId: string | null
  updateState: (
    updates:
      | Partial<LocalGameState>
      | ((prevState: LocalGameState) => Partial<LocalGameState>)
  ) => void
  dispatchRound: Dispatch<RoundAction>
  setError: (error: string | null) => void
}

/**
 * Custom hook for managing all Firebase listeners for a game
 *
 * Sets up listeners for:
 * - Players (child_added, child_changed)
 * - Game updates (child_added, child_changed)
 * - Game removal (child_removed)
 * - Hand add (child_added)
 * - Hand remove (child_removed)
 * - Trump (value)
 * - Tricks (child_added, child_changed)
 * - Bids (child_added)
 */
const useGameListeners = ({
  gameId,
  playerId,
  roundId,
  updateState,
  dispatchRound,
  setError,
}: UseGameListenersOptions) => {
  // Store all unsubscribe functions
  const unsubscribeFuncs = useRef<(() => void)[]>([])
  // Track previous roundId to detect round changes
  const prevRoundIdRef = useRef<string | null>(null)

  // Remove all listeners
  const removeListeners = useCallback(() => {
    unsubscribeFuncs.current.forEach((unsubscribe) => unsubscribe())
    unsubscribeFuncs.current = []
  }, [])

  // Players
  const playersRef = useMemo(
    () => (gameId ? ref(db, `games/${gameId}/players`) : null),
    [gameId]
  )

  useFirebaseListener({
    ref: playersRef,
    enabled: !!gameId,
    eventType: ADDED_OR_CHANGED,
    onData: useCallback(
      (snapshot: DataSnapshot) => {
        const player = snapshot.val() as Player
        updateState((prevState) => ({
          players: {
            ...prevState.players,
            [player.playerId]: player,
          },
        }))
      },
      [updateState]
    ),
    onError: useCallback(
      (error: Error) => {
        setError(error.message)
      },
      [setError]
    ),
  })

  // Game
  const gameRef = useMemo(() => (gameId ? ref(db, `games/${gameId}`) : null), [gameId])

  useFirebaseListener({
    ref: gameRef,
    enabled: !!gameId,
    eventType: ADDED_OR_CHANGED,
    onData: useCallback(
      (snapshot: DataSnapshot) => {
        const value = snapshot.val()
        const key = snapshot.key

        if (
          key === 'state' &&
          value?.roundId &&
          prevRoundIdRef.current &&
          prevRoundIdRef.current !== value.roundId
        ) {
          updateState({ hand: [], bid: 0 })
          dispatchRound({ type: 'RESET' })
        }

        if (key === 'state' && value?.roundId) {
          prevRoundIdRef.current = value.roundId
        }

        updateState((prevState) => ({
          game: { ...prevState.game, [key as string]: value } as Game,
        }))
      },
      [updateState, dispatchRound]
    ),
    onError: useCallback(
      (error: Error) => {
        setError(error.message)
      },
      [setError]
    ),
  })

  useFirebaseListener({
    ref: gameRef,
    enabled: !!gameId,
    eventType: CHILD_REMOVED,
    onData: useCallback(
      (snapshot: DataSnapshot) => {
        const key = snapshot.key
        updateState((prevState) => ({
          game: { ...prevState.game, [key as string]: null } as Game,
        }))
      },
      [updateState]
    ),
    onError: useCallback(
      (error: Error) => {
        setError(error.message)
      },
      [setError]
    ),
  })

  // Hand
  const handRef = useMemo(
    () =>
      playerId && roundId && gameId
        ? ref(db, `games/${gameId}/players/${playerId}/hands/${roundId}/cards`)
        : null,
    [playerId, roundId, gameId]
  )

  useFirebaseListener({
    ref: handRef,
    enabled: !!(playerId && roundId),
    eventType: CHILD_ADDED,
    onData: useCallback(
      (snapshot: DataSnapshot) => {
        const card = snapshot.val() as Card
        updateState((prevState) => {
          const cardIndex = prevState.hand.findIndex((c) => c.cardId === card.cardId)
          if (cardIndex === -1) {
            return {
              hand: [...prevState.hand, card],
            }
          }
          return {}
        })
      },
      [updateState]
    ),
    onError: useCallback(
      (error: Error) => {
        setError(error.message)
      },
      [setError]
    ),
  })

  useFirebaseListener({
    ref: handRef,
    enabled: !!(playerId && roundId),
    eventType: CHILD_REMOVED,
    onData: useCallback(
      (snapshot: DataSnapshot) => {
        const key = snapshot.key
        updateState((prevState) => ({
          hand: prevState.hand.filter((c) => c.cardId !== key),
        }))
      },
      [updateState]
    ),
    onError: useCallback(
      (error: Error) => {
        setError(error.message)
      },
      [setError]
    ),
  })

  // Trump
  const trumpRef = useMemo(
    () => (roundId && gameId ? ref(db, `games/${gameId}/rounds/${roundId}/trump`) : null),
    [roundId, gameId]
  )

  useFirebaseListener({
    ref: trumpRef,
    enabled: !!roundId,
    eventType: VALUE,
    onData: useCallback(
      (snapshot: DataSnapshot) => {
        const trump = snapshot.val()
        dispatchRound({ type: 'SET_TRUMP', trump })
      },
      [dispatchRound]
    ),
    onError: useCallback(
      (error: Error) => {
        setError(error.message)
      },
      [setError]
    ),
  })

  // Tricks
  const tricksRef = useMemo(
    () =>
      roundId && gameId ? ref(db, `games/${gameId}/rounds/${roundId}/tricks`) : null,
    [roundId, gameId]
  )

  useFirebaseListener({
    ref: tricksRef,
    enabled: !!roundId,
    eventType: ADDED_OR_CHANGED,
    onData: useCallback(
      (snapshot: DataSnapshot, eventType: FirebaseEventType) => {
        const trick = snapshot.val()
        if (eventType === 'child_added') {
          dispatchRound({ type: 'ADD_TRICK', trick })
        } else if (eventType === 'child_changed') {
          dispatchRound({ type: 'UPDATE_TRICK', trick })
          if (trick.winner) {
            updateState({ lastWinner: trick.winner, lastCompletedTrick: trick })
          }
        }
      },
      [dispatchRound, updateState]
    ),
    onError: useCallback(
      (error: Error) => {
        setError(error.message)
      },
      [setError]
    ),
  })

  // Bids
  const bidsRef = useMemo(
    () => (roundId && gameId ? ref(db, `games/${gameId}/rounds/${roundId}/bids`) : null),
    [roundId, gameId]
  )

  useFirebaseListener({
    ref: bidsRef,
    enabled: !!roundId,
    eventType: CHILD_ADDED,
    onData: useCallback(
      (snapshot: DataSnapshot) => {
        const bidValue = snapshot.val()
        const pId = snapshot.key as string

        dispatchRound({ type: 'UPDATE_BID', playerId: pId, bidValue })

        updateState((prevState) => {
          // calculateAdjustedBid handles null/undefined game.settings gracefully
          const newBid = calculateAdjustedBid(
            prevState.bid,
            {}, // Bids are now managed in roundState, not in game state
            prevState.game?.settings,
            prevState.players
          )
          return { bid: newBid }
        })
      },
      [dispatchRound, updateState]
    ),
    onError: useCallback(
      (error: Error) => {
        setError(error.message)
      },
      [setError]
    ),
  })

  return {
    removeListeners,
  }
}

export default useGameListeners
