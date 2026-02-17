import { useCallback } from 'react'
import type { MutableRefObject } from 'react'
import {
  newGame,
  replayGame,
  startGame,
  playCard as playCardApi,
  submitBid as submitBidApi,
  addPlayer as addPlayerApi,
} from '../utils/api'
import { isLegal } from '../utils/helpers'
import { calculateAdjustedBid } from '../utils/bidHelpers'
import type { Card, Game, Trick, LocalGameState } from '../types'

interface UseGameActionsOptions {
  gameId: string
  playerId: string
  playerName: string
  game: Game | null
  hand: Card[]
  bid: number
  bids: Record<string, number>
  tricks: Trick[]
  trickIndex: number
  queuedCard: Card | null
  visible: boolean
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  updateState: (
    updates:
      | Partial<LocalGameState>
      | ((prevState: LocalGameState) => Partial<LocalGameState>)
  ) => void
  autoPlayTimeoutRef: MutableRefObject<NodeJS.Timeout | null>
}

/**
 * Custom hook for game actions
 *
 * Encapsulates all user actions: playing cards, bidding, starting games, etc.
 */
const useGameActions = ({
  gameId,
  playerId,
  playerName,
  game,
  hand,
  bid,
  bids,
  tricks,
  trickIndex,
  queuedCard,
  visible,
  setError,
  setLoading,
  updateState,
  autoPlayTimeoutRef,
}: UseGameActionsOptions) => {
  // Play card - handles playing a card or queuing it for later
  const playCard = useCallback(
    async (card: Card) => {
      try {
        if (autoPlayTimeoutRef.current) {
          clearTimeout(autoPlayTimeoutRef.current)
        }

        if (!game || !game.state || !game.metadata) {
          return
        }

        const trick = tricks[trickIndex]
        const currentPlayerId = game.state.playerOrder?.[game.state.currentPlayerIndex]

        if (!game.state.roundId || !trick?.trickId) {
          return
        }

        if (currentPlayerId !== playerId) {
          // Not our turn - queue the card for later auto-play
          updateState((prevState) => {
            let newCard: Card | null = card
            if (prevState.queuedCard && prevState.queuedCard.cardId === card.cardId) {
              newCard = null
            }
            return {
              queuedCard: newCard,
            }
          })
          return
        }

        const body = {
          playerId,
          card,
          gameId: game.metadata.gameId,
          roundId: game.state.roundId,
          trickId: trick.trickId,
        }

        setLoading(true)
        await playCardApi(body)
        setLoading(false)
      } catch (error) {
        setLoading(false)
        setError('Failed to submit bid')
        console.error(`playCard error:`, error)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setLoading, setError, tricks, trickIndex, game, playerId, updateState] // autoPlayTimeoutRef is a ref
  )

  // Your turn handler - auto-plays queued card when it's player's turn
  const yourTurn = useCallback(async () => {
    if (queuedCard) {
      autoPlayTimeoutRef.current = setTimeout(async () => {
        await playCard(queuedCard)
        updateState({ queuedCard: null })
      }, 700)
    } else {
      if (!visible) {
        updateState({ showYourTurn: true })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, queuedCard, playCard, updateState]) // autoPlayTimeoutRef is a ref, doesn't need to be in deps

  // Submit bid - submits the player's bid for the round
  const submitBid = useCallback(
    async (optionalBid?: number) => {
      try {
        setLoading(true)

        const bidValue = optionalBid !== undefined ? optionalBid : bid

        if (!game || !game.state || !game.state.roundId) return

        const { roundId } = game.state

        const body = {
          gameId,
          playerId,
          bid: bidValue,
          roundId,
        }

        await submitBidApi(body)
        setLoading(false)
      } catch (error) {
        setLoading(false)
        setError('Failed to submit bid')
        console.error(`submitBid error:`, error)
      }
    },
    [bid, game, playerId, gameId, setLoading, setError]
  )

  // Random play - plays a random legal card or bids randomly
  const randomPlay = useCallback(() => {
    if (!game) return

    const status = game.state?.status
    if (status === 'play') {
      const handCopy = [...hand]
      const trick = tricks[trickIndex]
      const leadSuit = trick?.leadSuit || null
      let randomIndex = Math.floor(Math.random() * handCopy.length)
      let card = handCopy[randomIndex]
      while (!isLegal({ hand, leadSuit, card: handCopy[randomIndex] })) {
        handCopy.splice(randomIndex, 1)
        randomIndex = Math.floor(Math.random() * handCopy.length)
        card = handCopy[randomIndex]
      }
      if (card) {
        playCard(card)
      }
    } else if (status === 'bid') {
      const randomBid = Math.floor(Math.random() * (hand.length + 1))
      submitBid(randomBid)
    }
  }, [game, hand, tricks, trickIndex, playCard, submitBid])

  // Play again - creates a new game with the same settings
  const playAgain = useCallback(async () => {
    try {
      if (!game || !game.metadata || !game.settings) return
      setLoading(true)

      const {
        metadata: { name, gameId: currentGameId },
        settings: { numCards, noBidPoints, dirty, timeLimit },
      } = game

      const body = {
        game: name,
        name: playerName,
        numCards,
        bidPoints: !noBidPoints,
        dirty,
        timeLimit: timeLimit ? Number(timeLimit) : null,
      }

      const response = await newGame(body)
      if (response.ok) {
        const { playerId: newPlayerId, gameId: gameIdResponse } = await response.json()
        localStorage.setItem(`oh-shit-${gameIdResponse}-player-id`, newPlayerId)
        await replayGame({
          oldGameId: currentGameId,
          newGameId: gameIdResponse,
        })
      }
      setLoading(false)
    } catch (error) {
      setLoading(false)
      setError('An error occurred')
      console.error(`playAgain error:`, error)
    }
  }, [setLoading, setError, game, playerName])

  // Add player - adds the current player to the game
  const addPlayer = useCallback(async () => {
    try {
      setLoading(true)
      const response = await addPlayerApi({ playerName, gameId })
      if (response.ok) {
        const { playerId: newPlayerId } = await response.json()
        localStorage.setItem(`oh-shit-${gameId}-player-id`, newPlayerId)
        localStorage.setItem('player-name', playerName)
        updateState({ playerId: newPlayerId })
        setLoading(false)
      }
    } catch (error) {
      setLoading(false)
      setError('An error occurred')
      console.error(`addPlayer error:`, error)
    }
  }, [setLoading, setError, playerName, gameId, updateState])

  // Start game - starts the game (host only)
  const startGameHandler = useCallback(async () => {
    try {
      if (!game?.settings?.numCards || !game.players) return
      setLoading(true)
      await startGame({
        gameId,
        players: game.players,
        numCards: game.settings.numCards,
      })
      setLoading(false)
    } catch (error) {
      setLoading(false)
      setError('Failed to start game')
      console.error(`startGame error:`, error)
    }
  }, [setLoading, setError, gameId, game])

  // Handle input change - updates state for form inputs
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value, name } = e.target
      updateState({ [name]: value })
    },
    [updateState]
  )

  // Handle bid toggle - increments or decrements bid with auto-adjustment
  const handleToggle = useCallback(
    (inc: boolean) => {
      updateState((prevState) => {
        const { game, players, bid } = prevState
        if (!game) return {}

        // Increment/decrement first, then auto-adjust if needed
        const adjustedBid = inc ? Number(bid) + 1 : Number(bid) - 1
        // calculateAdjustedBid handles null/undefined game.settings gracefully
        const newBid = calculateAdjustedBid(
          adjustedBid,
          bids,
          game.settings,
          players,
          inc
        )

        return { bid: newBid }
      })
    },
    [updateState, bids]
  )

  // Close modal - closes the winner modal
  const closeModal = useCallback(async () => {
    if (!game) return

    updateState({ lastWinner: null })
  }, [game, updateState])

  return {
    playCard,
    yourTurn,
    submitBid,
    randomPlay,
    playAgain,
    addPlayer,
    startGameHandler,
    handleChange,
    handleToggle,
    closeModal,
  }
}

export default useGameActions
