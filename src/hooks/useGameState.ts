import { useState, useCallback, useReducer, useRef, useEffect } from 'react'
import type { Trick, Suit, LocalGameState, RoundAction } from '../types'

interface RoundState {
  tricks: Trick[]
  bids: Record<string, number>
  trump: Suit | null
}

// Round state reducer for managing tricks, bids, trump, and winner modal
function roundReducer(state: RoundState, action: RoundAction): RoundState {
  switch (action.type) {
    case 'LOAD_INITIAL':
      return {
        tricks: action.tricks || [],
        bids: action.bids || {},
        trump: action.trump || null,
      }
    case 'SET_TRICKS':
      return {
        ...state,
        tricks: action.tricks,
      }
    case 'ADD_TRICK': {
      const isDuplicate = state.tricks.some((t) => t.trickId === action.trick.trickId)
      if (isDuplicate) {
        console.error('[BUG] Attempted to add duplicate trick!', action.trick.trickId)
        return state // Don't add duplicates
      }
      return {
        ...state,
        tricks: [...state.tricks, action.trick],
      }
    }
    case 'UPDATE_TRICK': {
      const idx = state.tricks.findIndex((t) => t.trickId === action.trick.trickId)
      if (idx === -1) {
        console.error(
          '[BUG] Trick not found in array during UPDATE_TRICK!',
          action.trick.trickId
        )
        return state // Trick not found, don't modify state
      }
      const updatedTricks = [...state.tricks]
      updatedTricks[idx] = action.trick
      return {
        ...state,
        tricks: updatedTricks,
      }
    }
    case 'SET_BIDS':
      return {
        ...state,
        bids: action.bids,
      }
    case 'UPDATE_BID':
      return {
        ...state,
        bids: {
          ...state.bids,
          [action.playerId]: action.bidValue,
        },
      }
    case 'SET_TRUMP':
      return {
        ...state,
        trump: action.trump,
      }
    case 'RESET':
      return {
        tricks: [],
        bids: {},
        trump: null,
      }
    default:
      return state
  }
}

const INITIAL_STATE: LocalGameState = {
  game: null,
  players: {},
  playerId: null,
  playerName: '',
  hand: [],
  bid: 0,
  showYourTurn: false,
  queuedCard: null,
  lastWinner: null,
}

const INITIAL_ROUND_STATE: RoundState = {
  tricks: [],
  bids: {},
  trump: null,
}

/**
 * Custom hook for managing game state and initialization
 */
const useGameState = ({ gameId }: { gameId: string }) => {
  // Local state
  const [state, setState] = useState(INITIAL_STATE)

  // Round state with reducer
  const [roundState, dispatchRound] = useReducer(roundReducer, INITIAL_ROUND_STATE)

  // Refs
  const listeners = useRef({
    players: [],
    game: [],
    hand: [],
    trump: [],
    tricks: [],
    bids: [],
  })
  const autoPlayTimeout = useRef(null)
  const currentBidsRef = useRef(roundState.bids)

  // Update state helper - supports both object and function updates
  const updateState = useCallback(
    (
      updates:
        | Partial<LocalGameState>
        | ((prevState: LocalGameState) => Partial<LocalGameState>)
    ) => {
      setState((prev) => {
        const newUpdates = typeof updates === 'function' ? updates(prev) : updates
        return { ...prev, ...newUpdates }
      })
    },
    []
  )

  // Keep bids ref in sync with reducer state
  useEffect(() => {
    currentBidsRef.current = roundState.bids
  }, [roundState.bids])

  // Initialize game state from localStorage
  const initializeGame = useCallback(() => {
    // Reset to initial state
    updateState(INITIAL_STATE)
    dispatchRound({ type: 'RESET' })

    const pId = localStorage.getItem(`oh-shit-${gameId}-player-id`)
    const pName = localStorage.getItem('player-name') || ''

    // Clean up old localStorage entries (keep only current game's player ID)
    Object.keys(localStorage).forEach((key) => {
      const val = localStorage[key]
      if (key.startsWith('oh-shit') && val !== pId) {
        localStorage.removeItem(key)
      }
    })

    updateState({ playerId: pId, playerName: pName })

    return { playerId: pId, playerName: pName }
  }, [gameId, updateState])

  // Reset state to initial
  const resetState = useCallback(() => {
    updateState(INITIAL_STATE)
    dispatchRound({ type: 'RESET' })
  }, [updateState])

  return {
    // State
    state,
    roundState,

    // State updaters
    updateState,
    dispatchRound,

    // Refs
    listeners,
    autoPlayTimeout,
    currentBidsRef,

    // Actions
    initializeGame,
    resetState,
  }
}

export default useGameState
