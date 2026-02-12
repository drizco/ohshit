import { useCallback, useRef, useMemo } from "react"
import { ref, query, orderByChild, equalTo } from "firebase/database"
import { db } from "../lib/firebase"
import useFirebaseListener from "./useFirebaseListener"
import { calculateAdjustedBid } from "../utils/bidHelpers"

const CHILD_ADDED = "child_added"
const CHILD_CHANGED = "child_changed"
const CHILD_REMOVED = "child_removed"
const VALUE = "value"
const ADDED_OR_CHANGED = [CHILD_ADDED, CHILD_CHANGED]

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
 *
 * @param {Object} options
 * @param {string} options.gameId - The game ID
 * @param {string} options.playerId - Current player's ID
 * @param {string} options.roundId - Current round ID
 * @param {Function} options.updateState - State updater function
 * @param {Function} options.dispatchRound - Round reducer dispatch function
 * @param {Object} options.context - Combined context
 * @returns {Object} { removeListeners }
 */
const useGameListeners = ({
  gameId,
  playerId,
  roundId,
  updateState,
  dispatchRound,
  context,
}) => {
  const setContextState = context.setState
  // Store all unsubscribe functions
  const unsubscribeFuncs = useRef([])

  // Remove all listeners
  const removeListeners = useCallback(() => {
    unsubscribeFuncs.current.forEach((unsubscribe) => unsubscribe())
    unsubscribeFuncs.current = []
  }, [])

  // Players
  const playersRef = useMemo(
    () =>
      gameId ? query(ref(db, "players"), orderByChild("gameId"), equalTo(gameId)) : null,
    [gameId],
  )

  useFirebaseListener({
    ref: playersRef,
    enabled: !!gameId,
    eventType: ADDED_OR_CHANGED,
    onData: useCallback(
      (snapshot) => {
        const player = snapshot.val()
        updateState((prevState) => ({
          players: {
            ...prevState.players,
            [player.playerId]: player,
          },
        }))
      },
      [updateState],
    ),
    onError: useCallback(
      (error) => {
        setContextState({ error: true })
        console.error("listenToPlayers error:", error)
      },
      [setContextState],
    ),
  })

  // Game
  const gameRef = useMemo(() => (gameId ? ref(db, `games/${gameId}`) : null), [gameId])

  useFirebaseListener({
    ref: gameRef,
    enabled: !!gameId,
    eventType: ADDED_OR_CHANGED,
    onData: useCallback(
      (snapshot) => {
        const value = snapshot.val()
        const key = snapshot.key
        updateState((prevState) => ({
          game: { ...prevState.game, [key]: value },
        }))
      },
      [updateState],
    ),
    onError: useCallback(
      (error) => {
        setContextState({ error: true })
        console.error("listenToGame (child_added/changed) error:", error)
      },
      [setContextState],
    ),
  })

  useFirebaseListener({
    ref: gameRef,
    enabled: !!gameId,
    eventType: CHILD_REMOVED,
    onData: useCallback(
      (snapshot) => {
        const key = snapshot.key
        updateState((prevState) => ({
          game: { ...prevState.game, [key]: null },
        }))
      },
      [updateState],
    ),
    onError: useCallback(
      (error) => {
        setContextState({ error: true })
        console.error("listenToGame (child_removed) error:", error)
      },
      [setContextState],
    ),
  })

  // Hand
  const handRef = useMemo(
    () =>
      playerId && roundId ? ref(db, `hands/${playerId}/rounds/${roundId}/cards`) : null,
    [playerId, roundId],
  )

  useFirebaseListener({
    ref: handRef,
    enabled: !!(playerId && roundId),
    eventType: CHILD_ADDED,
    onData: useCallback(
      (snapshot) => {
        const card = snapshot.val()
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
      [updateState],
    ),
    onError: useCallback(
      (error) => {
        setContextState({ error: true })
        console.error("listenToHand (child_added) error:", error)
      },
      [setContextState],
    ),
  })

  useFirebaseListener({
    ref: handRef,
    enabled: !!(playerId && roundId),
    eventType: CHILD_REMOVED,
    onData: useCallback(
      (snapshot) => {
        const key = snapshot.key
        updateState((prevState) => ({
          hand: prevState.hand.filter((c) => c.cardId !== key),
        }))
      },
      [updateState],
    ),
    onError: useCallback(
      (error) => {
        setContextState({ error: true })
        console.error("listenToHand (child_removed) error:", error)
      },
      [setContextState],
    ),
  })

  // Trump
  const trumpRef = useMemo(
    () => (roundId ? ref(db, `rounds/${roundId}/trump`) : null),
    [roundId],
  )

  useFirebaseListener({
    ref: trumpRef,
    enabled: !!roundId,
    eventType: VALUE,
    onData: useCallback(
      (snapshot) => {
        const trump = snapshot.val()
        dispatchRound({ type: "SET_TRUMP", trump })
      },
      [dispatchRound],
    ),
    onError: useCallback(
      (error) => {
        setContextState({ error: true })
        console.error("listenToTrump error:", error)
      },
      [setContextState],
    ),
  })

  // Tricks
  const tricksRef = useMemo(
    () => (roundId ? ref(db, `rounds/${roundId}/tricks`) : null),
    [roundId],
  )

  useFirebaseListener({
    ref: tricksRef,
    enabled: !!roundId,
    eventType: ADDED_OR_CHANGED,
    onData: useCallback(
      (snapshot, eventType) => {
        const trick = snapshot.val()
        if (eventType === "child_added") {
          dispatchRound({ type: "ADD_TRICK", trick })
        } else if (eventType === "child_changed") {
          dispatchRound({ type: "UPDATE_TRICK", trick })
        }
      },
      [dispatchRound],
    ),
    onError: useCallback(
      (error) => {
        setContextState({ error: true })
        console.error("listenToTrick error:", error)
      },
      [setContextState],
    ),
  })

  // Bids
  const bidsRef = useMemo(
    () => (roundId ? ref(db, `rounds/${roundId}/bids`) : null),
    [roundId],
  )

  useFirebaseListener({
    ref: bidsRef,
    enabled: !!roundId,
    eventType: CHILD_ADDED,
    onData: useCallback(
      (snapshot) => {
        const bidValue = snapshot.val()
        const pId = snapshot.key

        dispatchRound({ type: "UPDATE_BID", playerId: pId, bidValue })

        updateState((prevState) => {
          const newBids = {
            ...prevState.bids,
            [pId]: bidValue,
          }
          const newBid = calculateAdjustedBid(
            prevState.bid,
            newBids,
            prevState.game,
            prevState.players,
          )
          return { bid: newBid }
        })
      },
      [dispatchRound, updateState],
    ),
    onError: useCallback(
      (error) => {
        setContextState({ error: true })
        console.error("listenToBid error:", error)
      },
      [setContextState],
    ),
  })

  return {
    removeListeners,
  }
}

export default useGameListeners
