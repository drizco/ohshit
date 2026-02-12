import { useCallback } from "react"
import {
  newGame,
  replayGame,
  startGame,
  playCard as playCardApi,
  submitBid as submitBidApi,
  addPlayer as addPlayerApi,
  nextRound as nextRoundApi,
} from "../utils/api"
import { calculateLeader, isLegal } from "../utils/helpers"
import { calculateAdjustedBid } from "../utils/bidHelpers"

/**
 * Custom hook for game actions
 *
 * Encapsulates all user actions: playing cards, bidding, starting games, etc.
 *
 * @param {Object} options
 * @param {string} options.gameId - The game ID
 * @param {string} options.playerId - Current player's ID
 * @param {string} options.playerName - Current player's name
 * @param {Object} options.game - Game state
 * @param {Object} options.players - Players state
 * @param {Array} options.hand - Player's hand
 * @param {number} options.bid - Current bid value
 * @param {Object} options.bids - All bids
 * @param {Array} options.tricks - Array of tricks
 * @param {number} options.trickIndex - Current trick index
 * @param {string} options.trump - Trump suit
 * @param {Object} options.queuedCard - Queued card for auto-play
 * @param {boolean} options.visible - Page visibility state
 * @param {Function} options.setState - Context setState function
 * @param {Function} options.updateState - State updater
 * @param {Function} options.dispatchRound - Round dispatch
 * @param {Object} options.autoPlayTimeoutRef - Ref for auto-play timeout
 * @returns {Object} Action functions
 */
const useGameActions = ({
  gameId,
  playerId,
  playerName,
  game,
  players,
  hand,
  bid,
  bids,
  tricks,
  trickIndex,
  trump,
  queuedCard,
  visible,
  setState,
  updateState,
  dispatchRound,
  autoPlayTimeoutRef,
}) => {
  // Next round - advances to the next round after all tricks are played
  const nextRound = useCallback(async () => {
    try {
      if (!game) return

      let {
        numCards: nc,
        roundNum: rn,
        descending: desc,
        dealer: oldDealer,
        gameId: gId,
        numRounds,
        roundId,
        noBidPoints,
      } = game

      let descending = desc
      const roundNum = rn + 1
      let numCards = descending ? nc - 1 : nc + 1

      if (numCards < 1) {
        descending = false
        numCards = 2
      }

      const dealer = players[oldDealer].nextPlayer
      const gameOver = roundNum > numRounds

      const body = {
        roundNum,
        numRounds,
        numCards,
        descending,
        gameId: gId,
        noBidPoints,
        roundId,
        gameOver,
        dealer,
      }

      await nextRoundApi(body)
    } catch (error) {
      setState({ error: true })
      console.error(`nextRound error:`, error)
    }
  }, [setState, game, players])

  // Play card - handles playing a card or queuing it for later
  const playCard = useCallback(
    async (card) => {
      try {
        if (autoPlayTimeoutRef.current) {
          clearTimeout(autoPlayTimeoutRef.current)
        }

        setState({ loading: true })

        const trick = tricks[trickIndex]
        let leadSuit

        if (!trick || !trick.cards || !Object.values(trick.cards).length) {
          leadSuit = card.suit
        }
        if (trick?.leadSuit) {
          leadSuit = trick.leadSuit
        }

        if (
          game &&
          game.status === "play" &&
          game.currentPlayer &&
          game.currentPlayer === playerId &&
          isLegal({ hand, card, leadSuit })
        ) {
          const allCards = [...Object.values(trick.cards || {}), card]
          const allCardsIn = allCards.length === game.numPlayers
          const isNextRound = allCardsIn && hand.length === 1

          let leader = calculateLeader({
            cards: allCards,
            trump,
            leadSuit: leadSuit || trick.leadSuit,
          })
          if (leader) {
            leader = leader.playerId
          }

          const nextPlayerId = players[playerId].nextPlayer

          const body = {
            playerId,
            nextPlayerId,
            card,
            leader,
            allCardsIn,
            gameId: game.gameId,
            roundId: game.roundId,
            trickId: trick.trickId,
            leadSuit,
            nextRound: isNextRound,
          }

          await playCardApi(body)

          if (isNextRound) {
            await nextRound()
          }
        } else if (
          game &&
          game.status === "play" &&
          game.currentPlayer &&
          game.currentPlayer !== playerId &&
          isLegal({ hand, card, leadSuit }) &&
          (!trick || !trick.cards || !trick.cards[playerId])
        ) {
          updateState((prevState) => {
            let newCard = card
            if (prevState.queuedCard && prevState.queuedCard.cardId === card.cardId) {
              newCard = null
            }
            return {
              queuedCard: newCard,
            }
          })
        }

        setState({ loading: false })
      } catch (error) {
        setState({ loading: false, error: true })
        console.error(`playCard error:`, error)
      }
    },
    [
      setState,
      tricks,
      trickIndex,
      game,
      playerId,
      hand,
      trump,
      players,
      nextRound,
      updateState,
      autoPlayTimeoutRef,
    ],
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
  }, [visible, queuedCard, playCard, updateState, autoPlayTimeoutRef])

  // Submit bid - submits the player's bid for the round
  const submitBid = useCallback(
    async (optionalBid) => {
      try {
        setState({ loading: true })

        const bidValue = optionalBid !== undefined ? optionalBid : bid

        if (!game) return

        const { numPlayers, roundId } = game
        const allBidsIn = Object.keys(bids || {}).length === numPlayers - 1
        const nextPlayerId = players[playerId].nextPlayer

        const body = {
          gameId,
          playerId,
          nextPlayerId,
          bid: bidValue,
          allBidsIn,
          roundId,
        }

        await submitBidApi(body)
        setState({ loading: false })
      } catch (error) {
        setState({ loading: false, error: true })
        console.error(`submitBid error:`, error)
      }
    },
    [bid, game, bids, players, playerId, gameId, setState],
  )

  // Random play - plays a random legal card or bids randomly
  const randomPlay = useCallback(() => {
    if (!game) return

    const { status } = game

    if (status === "play") {
      let handCopy = [...hand]
      let leadSuit
      const trick = tricks[trickIndex]
      if (trick && trick.leadSuit) {
        leadSuit = trick.leadSuit
      }
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
    } else if (status === "bid") {
      const randomBid = Math.floor(Math.random() * (hand.length + 1))
      submitBid(randomBid)
    }
  }, [game, hand, tricks, trickIndex, playCard, submitBid])

  // Play again - creates a new game with the same settings
  const playAgain = useCallback(async () => {
    try {
      if (!game) return
      setState({ loading: true })

      const {
        name,
        numCards,
        noBidPoints,
        dirty,
        timeLimit,
        gameId: currentGameId,
      } = game

      const body = {
        game: name,
        name: playerName,
        numCards,
        noBidPoints,
        dirty,
        timeLimit: timeLimit ? Number(timeLimit) : null,
      }

      const response = await newGame(body)
      if (response.ok) {
        const { playerId: newPlayerId, gameId: gameIdResponse } = await response.json()
        localStorage.setItem(`oh-shit-${gameIdResponse}-player-id`, newPlayerId)
        await replayGame({ oldGameId: currentGameId, newGameId: gameIdResponse })
      }
      setState({ loading: false })
    } catch (error) {
      setState({ loading: false, error: true })
      console.error(`playAgain error:`, error)
    }
  }, [setState, game, playerName])

  // Add player - adds the current player to the game
  const addPlayer = useCallback(async () => {
    try {
      setState({ loading: true })
      const response = await addPlayerApi({ playerName, gameId })
      if (response.ok) {
        const { playerId: newPlayerId } = await response.json()
        localStorage.setItem(`oh-shit-${gameId}-player-id`, newPlayerId)
        localStorage.setItem("player-name", playerName)
        updateState({ playerId: newPlayerId })
        setState({ loading: false })
      }
    } catch (error) {
      setState({ loading: false, error: true })
      console.error(`addPlayer error:`, error)
    }
  }, [setState, playerName, gameId, updateState])

  // Start game - starts the game (host only)
  const startGameHandler = useCallback(async () => {
    try {
      setState({ loading: true })
      await startGame({ gameId })
      setState({ loading: false })
    } catch (error) {
      setState({ loading: false, error: true })
      console.error(`startGame error:`, error)
    }
  }, [setState, gameId])

  // Handle input change - updates state for form inputs
  const handleChange = useCallback(
    (e) => {
      const { value, name } = e.target
      updateState({ [name]: value })
    },
    [updateState],
  )

  // Handle bid toggle - increments or decrements bid with auto-adjustment
  const handleToggle = useCallback(
    (inc) => {
      updateState((prevState) => {
        const { game, players, bid } = prevState
        if (!game) return {}

        // Increment/decrement first, then auto-adjust if needed
        const adjustedBid = inc ? Number(bid) + 1 : Number(bid) - 1
        const newBid = calculateAdjustedBid(adjustedBid, bids, game, players, inc)

        return { bid: newBid }
      })
    },
    [updateState, bids],
  )

  // Close modal - closes the winner modal
  const closeModal = useCallback(async () => {
    if (!game) return

    dispatchRound({ type: "HIDE_WINNER_MODAL" })
  }, [game, dispatchRound])

  return {
    nextRound,
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
