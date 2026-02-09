import {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
  useMemo,
  useReducer,
} from "react"
import { useRouter } from "next/router"
import Link from "next/link"
import { Container, Button, Row, Col, Modal, ModalBody, ModalHeader } from "reactstrap"
import {
  ref,
  query,
  orderByChild,
  equalTo,
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  get,
} from "firebase/database"
import CombinedContext from "../../context/CombinedContext"
import { db, auth } from "../../lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import styles from "../../styles/pages/game.module.scss"
import CardRow from "../../components/CardRow"
import {
  getSource,
  calculateLeader,
  isLegal,
  getScore,
  getWinner,
  getAvailableTricks,
} from "../../utils/helpers"
import { calculateAdjustedBid } from "../../utils/bidHelpers"
import Players from "../../components/Players"
import NotificationController from "../../components/NotificationController"
import {
  newGame,
  replayGame,
  startGame,
  playCard as playCardApi,
  submitBid as submitBidApi,
  updatePlayer,
  addPlayer as addPlayerApi,
  nextRound as nextRoundApi,
} from "../../utils/api"
import CustomTrump from "../../components/CustomTrump"
import TurnChange from "../../components/TurnChange"
import CountdownOverlay from "../../components/CountdownOverlay"
import JoinGameForm from "../../components/JoinGameForm"

// Round state reducer for managing tricks, bids, trump, and winner modal
function roundReducer(state, action) {
  switch (action.type) {
    case "LOAD_INITIAL":
      return {
        tricks: action.tricks || [],
        bids: action.bids || {},
        trump: action.trump || null,
        showWinnerModal: false,
      }
    case "SET_TRICKS":
      return {
        ...state,
        tricks: action.tricks,
      }
    case "ADD_TRICK":
      return {
        ...state,
        tricks: [...state.tricks, action.trick],
      }
    case "UPDATE_TRICK": {
      const updatedTricks = [...state.tricks]
      const idx = updatedTricks.findIndex((t) => t.trickId === action.trick.trickId)
      updatedTricks[idx] = action.trick
      return {
        ...state,
        tricks: updatedTricks,
        showWinnerModal: action.trick.winner ? true : state.showWinnerModal,
      }
    }
    case "SET_BIDS":
      return {
        ...state,
        bids: action.bids,
      }
    case "UPDATE_BID":
      return {
        ...state,
        bids: {
          ...state.bids,
          [action.playerId]: action.bidValue,
        },
      }
    case "SET_TRUMP":
      return {
        ...state,
        trump: action.trump,
      }
    case "SHOW_WINNER_MODAL":
      return {
        ...state,
        showWinnerModal: true,
      }
    case "HIDE_WINNER_MODAL":
      return {
        ...state,
        showWinnerModal: false,
      }
    case "RESET":
      return {
        tricks: [],
        bids: {},
        trump: null,
        showWinnerModal: false,
      }
    default:
      return state
  }
}

const INITIAL_STATE = {
  game: null,
  players: {},
  playerId: null,
  playerName: "",
  hand: [],
  bid: 0,
  showYourTurn: false,
  queuedCard: null,
}

const INITIAL_ROUND_STATE = {
  tricks: [],
  bids: {},
  trump: null,
  showWinnerModal: false,
}

function Game({ gameId, isMobile }) {
  const router = useRouter()
  const context = useContext(CombinedContext)

  const [state, setState] = useState(INITIAL_STATE)
  const { game, players, playerId, playerName, hand, bid, showYourTurn, queuedCard } =
    state

  // Round state managed by reducer
  const [roundState, dispatchRound] = useReducer(roundReducer, INITIAL_ROUND_STATE)
  const { tricks, bids, trump, showWinnerModal } = roundState

  // Computed properties (derived from state)
  const trickIndex = useMemo(() => (tricks.length > 0 ? tricks.length - 1 : 0), [tricks])
  const roundScore = useMemo(() => getScore(tricks), [tricks])
  const isHost = useMemo(() => playerId && players[playerId]?.host, [playerId, players])
  const winner = useMemo(() => tricks[trickIndex]?.winner, [tricks, trickIndex])

  const listeners = useRef({
    players: [],
    game: [],
    hand: [],
    trump: [],
    tricks: [],
    bids: [],
  })
  const autoPlayTimeout = useRef(null)
  const currentBidsRef = useRef(bids)

  const updateState = useCallback((updates) => {
    setState((prev) => {
      const newUpdates = typeof updates === "function" ? updates(prev) : updates
      return { ...prev, ...newUpdates }
    })
  }, [])

  // Keep bids ref in sync with reducer state
  useEffect(() => {
    currentBidsRef.current = bids
  }, [bids])

  const removeListeners = useCallback(() => {
    Object.values(listeners.current).forEach((unsubArray) => {
      unsubArray.forEach((unsub) => unsub?.())
    })
    listeners.current = {
      players: [],
      game: [],
      hand: [],
      trump: [],
      tricks: [],
      bids: [],
    }
  }, [])

  // Listen to players
  const listenToPlayers = useCallback(
    async (gId) => {
      try {
        const playersQuery = query(
          ref(db, "players"),
          orderByChild("gameId"),
          equalTo(gId),
        )

        const unsubAdded = onChildAdded(playersQuery, (snapshot) => {
          const player = snapshot.val()
          updateState((prevState) => ({
            players: {
              ...prevState.players,
              [player.playerId]: player,
            },
          }))
        })

        const unsubChanged = onChildChanged(playersQuery, (snapshot) => {
          const player = snapshot.val()
          updateState((prevState) => ({
            players: {
              ...prevState.players,
              [player.playerId]: player,
            },
          }))
        })

        listeners.current.players = [unsubAdded, unsubChanged]
      } catch (error) {
        context.setState({ error: true })
        console.error(`listenToPlayers error:`, error)
      }
    },
    [updateState, context],
  )

  // Listen to game
  const listenToGame = useCallback(
    async ({ gameId: gId }) => {
      try {
        const gameRef = ref(db, `games/${gId}`)

        const unsubAdded = onChildAdded(gameRef, (snapshot) => {
          const value = snapshot.val()
          const key = snapshot.key

          updateState((prevState) => {
            const newGame = { ...prevState.game, [key]: value }
            return { game: newGame }
          })
        })

        const unsubChanged = onChildChanged(gameRef, (snapshot) => {
          const value = snapshot.val()
          const key = snapshot.key

          updateState((prevState) => ({
            game: { ...prevState.game, [key]: value },
          }))
        })

        const unsubRemoved = onChildRemoved(gameRef, (snapshot) => {
          const key = snapshot.key
          updateState((prevState) => ({
            game: { ...prevState.game, [key]: null },
          }))
        })

        listeners.current.game = [unsubAdded, unsubChanged, unsubRemoved]
      } catch (error) {
        context.setState({ error: true })
        console.error(`listenToGame error:`, error)
      }
    },
    [updateState, context],
  )

  // Listen to hand
  const listenToHand = useCallback(
    async ({ playerId: pId, roundId }) => {
      try {
        // Clean up existing hand listeners
        if (listeners.current.hand.length) {
          listeners.current.hand.forEach((unsub) => unsub())
          listeners.current.hand = []
        }

        const handRef = ref(db, `hands/${pId}/rounds/${roundId}/cards`)

        const unsubAdded = onChildAdded(handRef, (snapshot) => {
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
        })

        const unsubRemoved = onChildRemoved(handRef, (snapshot) => {
          const key = snapshot.key
          updateState((prevState) => ({
            hand: prevState.hand.filter((c) => c.cardId !== key),
          }))
        })

        listeners.current.hand = [unsubAdded, unsubRemoved]
      } catch (error) {
        context.setState({ error: true })
        console.error(`listenToHand error:`, error)
      }
    },
    [updateState, context],
  )

  // Listen to trump
  const listenToTrump = useCallback(
    async (roundId) => {
      try {
        // Clean up existing trump listener
        if (listeners.current.trump.length) {
          listeners.current.trump.forEach((unsub) => unsub())
          listeners.current.trump = []
        }

        const trumpRef = ref(db, `rounds/${roundId}/trump`)

        const unsub = onValue(trumpRef, (snapshot) => {
          const trump = snapshot.val()
          dispatchRound({ type: "SET_TRUMP", trump })
        })

        listeners.current.trump = [unsub]
      } catch (error) {
        context.setState({ error: true })
        console.error(`listenToTrump error:`, error)
      }
    },
    [dispatchRound, context],
  )

  // Listen to tricks
  const listenToTrick = useCallback(
    async (roundId) => {
      try {
        // Clean up existing trick listeners
        if (listeners.current.tricks.length) {
          listeners.current.tricks.forEach((unsub) => unsub())
          listeners.current.tricks = []
        }

        const trickRef = ref(db, `rounds/${roundId}/tricks`)
        const loadedTrickIds = new Set()

        // Load initial data
        const initialSnapshot = await get(trickRef)
        const tricks = Object.values(initialSnapshot.val() || {})
        tricks.forEach((trick) => loadedTrickIds.add(trick.trickId))
        dispatchRound({ type: "SET_TRICKS", tricks })

        // Set up listeners for updates
        const unsubAdded = onChildAdded(trickRef, (snapshot) => {
          const trick = snapshot.val()
          if (!loadedTrickIds.has(trick.trickId)) {
            loadedTrickIds.add(trick.trickId)
            dispatchRound({ type: "ADD_TRICK", trick })
          }
        })

        const unsubChanged = onChildChanged(trickRef, (snapshot) => {
          const trick = snapshot.val()
          dispatchRound({ type: "UPDATE_TRICK", trick })
        })

        listeners.current.tricks = [unsubAdded, unsubChanged]
      } catch (error) {
        context.setState({ error: true })
        console.error(`listenToTrick error:`, error)
      }
    },
    [dispatchRound, context],
  )

  // Listen to bids
  const listenToBid = useCallback(
    async (roundId) => {
      try {
        // Clean up existing bid listeners
        if (listeners.current.bids.length) {
          listeners.current.bids.forEach((unsub) => unsub())
          listeners.current.bids = []
        }

        const bidRef = ref(db, `rounds/${roundId}/bids`)
        const loadedBidPlayerIds = new Set()

        // Load initial data and auto-adjust bid if needed (batched update)
        const initialSnapshot = await get(bidRef)
        const bids = initialSnapshot.val() || {}
        Object.keys(bids).forEach((playerId) => loadedBidPlayerIds.add(playerId))

        // Set bids in reducer
        dispatchRound({ type: "SET_BIDS", bids })

        // Adjust current bid based on new bids
        updateState((prevState) => {
          const newBid = calculateAdjustedBid(
            prevState.bid,
            bids,
            prevState.game,
            prevState.players,
          )
          return { bid: newBid }
        })

        // Set up listener for updates
        const unsubAdded = onChildAdded(bidRef, (snapshot) => {
          const bidValue = snapshot.val()
          const playerId = snapshot.key

          if (!loadedBidPlayerIds.has(playerId)) {
            loadedBidPlayerIds.add(playerId)

            // Update bids in reducer
            dispatchRound({ type: "UPDATE_BID", playerId, bidValue })

            // Adjust current bid
            updateState((prevState) => {
              const newBids = {
                ...bids,
                [playerId]: bidValue,
              }
              const newBid = calculateAdjustedBid(
                prevState.bid,
                newBids,
                prevState.game,
                prevState.players,
              )
              return { bid: newBid }
            })
          }
        })

        listeners.current.bids = [unsubAdded]
      } catch (error) {
        context.setState({ error: true })
        console.error(`listenToBid error:`, error)
      }
    },
    [updateState, dispatchRound, context],
  )

  // Listen to round (combines trump, tricks, and bids)
  const listenToRound = useCallback(
    async (roundId) => {
      try {
        await Promise.all([
          listenToTrump(roundId),
          listenToTrick(roundId),
          listenToBid(roundId),
        ])
      } catch (error) {
        context.setState({ error: true })
        console.error(`listenToRound error:`, error)
      }
    },
    [listenToTrump, listenToTrick, listenToBid, context],
  )

  // Window close listener
  const listenForWindowClose = useCallback(
    (pId) => {
      window.addEventListener("unload", async () => {
        await updatePlayer({ playerId: pId, gameId, present: false })
      })
    },
    [gameId],
  )

  // Initialize game
  const initializeGame = useCallback(async () => {
    try {
      // Reset to initial state
      updateState(INITIAL_STATE)

      const pId = localStorage.getItem(`oh-shit-${gameId}-player-id`)
      const pName = localStorage.getItem("player-name") || ""

      // Clean up old localStorage entries
      Object.keys(localStorage).forEach((key) => {
        const val = localStorage[key]
        if (key.startsWith("oh-shit") && val !== pId) {
          localStorage.removeItem(key)
        }
      })

      updateState({ playerId: pId, playerName: pName })

      await Promise.all([
        listenToPlayers(gameId),
        listenToGame({ gameId, playerId: pId }),
      ])

      if (pId) {
        await updatePlayer({ playerId: pId, gameId, present: true })
      }
    } catch (error) {
      context.setState({ error: true })
      console.error(`initializeGame error:`, error)
    }
  }, [gameId, updateState, listenToPlayers, listenToGame, context])

  // Effect: Initialize game once auth is ready
  useEffect(() => {
    // Wait for auth to be ready before initializing
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        initializeGame()
        unsubscribe() // Only initialize once
      }
    })

    return () => {
      unsubscribe()
      removeListeners()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Effect: Update player presence on unmount
  useEffect(() => {
    return () => {
      if (playerId) {
        updatePlayer({ playerId, gameId, present: true })
      }
    }
  }, [playerId, gameId])

  // Effect: Setup window close listener when playerId changes
  useEffect(() => {
    if (playerId) {
      listenForWindowClose(playerId)
    }
  }, [listenForWindowClose, playerId])

  // Effect: Setup round listeners when game.roundId changes
  useEffect(() => {
    if (game?.roundId && playerId) {
      listenToRound(game.roundId)
      listenToHand({ playerId, roundId: game.roundId })
    }
  }, [game?.roundId, listenToHand, listenToRound, playerId])

  // Next round
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
      context.setState({ error: true })
      console.error(`nextRound error:`, error)
    }
  }, [context, game, players])

  // Play card
  const playCard = useCallback(
    async (card) => {
      try {
        if (autoPlayTimeout.current) {
          clearTimeout(autoPlayTimeout.current)
        }

        context.setState({ loading: true })

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

        context.setState({ loading: false })
      } catch (error) {
        context.setState({ loading: false, error: true })
        console.error(`playCard error:`, error)
      }
    },
    [
      context,
      tricks,
      trickIndex,
      game,
      playerId,
      hand,
      trump,
      players,
      nextRound,
      updateState,
    ],
  )

  // Your turn handler
  const yourTurn = useCallback(async () => {
    const { visible } = context
    if (queuedCard) {
      autoPlayTimeout.current = setTimeout(async () => {
        await playCard(queuedCard)
        updateState({ queuedCard: null })
      }, 700)
    } else {
      if (!visible) {
        updateState({ showYourTurn: true })
      }
    }
  }, [context, queuedCard, playCard, updateState])

  // Submit bid
  const submitBid = useCallback(
    async (optionalBid) => {
      try {
        context.setState({ loading: true })

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
        context.setState({ loading: false })
      } catch (error) {
        context.setState({ loading: false, error: true })
        console.error(`submitBid error:`, error)
      }
    },
    [bid, game, bids, players, playerId, gameId, context],
  )

  // Random play
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

  // Play again
  const playAgain = useCallback(async () => {
    try {
      if (!game) return
      context.setState({ loading: true })

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
      context.setState({ loading: false })
    } catch (error) {
      context.setState({ loading: false, error: true })
      console.error(`playAgain error:`, error)
    }
  }, [context, game, playerName])

  // Add player
  const addPlayer = useCallback(async () => {
    try {
      context.setState({ loading: true })
      const response = await addPlayerApi({ playerName, gameId })
      if (response.ok) {
        const { playerId: newPlayerId } = await response.json()
        localStorage.setItem(`oh-shit-${gameId}-player-id`, newPlayerId)
        localStorage.setItem("player-name", playerName)
        updateState({ playerId: newPlayerId })
        listenToGame({ gameId, playerId: newPlayerId })
        context.setState({ loading: false })
      }
    } catch (error) {
      context.setState({ loading: false, error: true })
      console.error(`addPlayer error:`, error)
    }
  }, [context, playerName, gameId, updateState, listenToGame])

  // Start game
  const startGameHandler = useCallback(async () => {
    try {
      context.setState({ loading: true })
      await startGame({ gameId })
      context.setState({ loading: false })
    } catch (error) {
      context.setState({ loading: false, error: true })
      console.error(`startGame error:`, error)
    }
  }, [context, gameId])

  // Handle input change
  const handleChange = useCallback(
    (e) => {
      const { value, name } = e.target
      updateState({ [name]: value })
    },
    [updateState],
  )

  // Handle bid toggle
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

  // Close modal
  const closeModal = useCallback(async () => {
    if (!game) return

    const { roundId } = game

    await Promise.all([listenToRound(roundId), listenToHand({ playerId, roundId })])

    dispatchRound({ type: "HIDE_WINNER_MODAL" })
  }, [game, playerId, listenToRound, listenToHand, dispatchRound])

  const userName = playerId ? (players[playerId]?.name ?? "") : ""

  const { dark, timer } = context

  if (!game) return null

  const {
    name,
    status,
    currentPlayer,
    gameScore,
    dealer,
    roundNum,
    numRounds,
    numCards,
    nextGame,
    timeLimit,
  } = game

  const trick = tricks && trickIndex !== undefined ? tricks[trickIndex] : null
  const leadSuit = trick?.leadSuit

  const timerShowMax = timeLimit > 10 ? 10 : 5
  return (
    <>
      <div className={styles.game_page}>
        <CountdownOverlay
          timeRemaining={timer}
          isVisible={playerId === currentPlayer && timer >= 0 && timer <= timerShowMax}
        />
        <Row className={styles.info_row}>
          <Col xs="4">
            {name && <h2 style={{ textDecoration: "underline" }}>{name}</h2>}
          </Col>
          <Col xs="4">
            {isHost && status && status === "pending" && (
              <Row>
                <Button color="success" onClick={startGameHandler}>
                  START GAME
                </Button>
              </Row>
            )}
            {status && (status === "bid" || status === "play" || status === "over") && (
              <>
                <h4>{`ROUND: ${roundNum} of ${numRounds}`}</h4>
                <h4>{`TOTAL TRICKS: ${numCards}`}</h4>
                <h4>{`TRICKS AVAILABLE: ${getAvailableTricks({
                  numCards,
                  bids,
                })}`}</h4>
              </>
            )}
          </Col>
          <Col xs="2" className={styles.lead_trump_container}>
            {leadSuit && (
              <>
                <h3>LEAD</h3>
                <img src={getSource(leadSuit, dark)} />
              </>
            )}
          </Col>
          <Col xs="2" className={styles.lead_trump_container}>
            {trump && (
              <>
                <CustomTrump />
                <img src={getSource(trump, dark)} />
              </>
            )}
          </Col>
        </Row>
        {!playerId && (
          <JoinGameForm
            playerName={playerName}
            onPlayerNameChange={handleChange}
            onJoin={addPlayer}
          />
        )}
        <Players
          players={players}
          currentPlayer={currentPlayer}
          bids={bids}
          roundScore={roundScore}
          trick={trick}
          bid={bid}
          setBid={(bid) => updateState({ bid })}
          dealer={dealer}
          handleToggle={handleToggle}
          submitBid={submitBid}
          afterBid={() => updateState({ bid: 0 })}
          thisPlayer={playerId}
          gameScore={gameScore}
          timeLimit={timeLimit}
          winnerModalShowing={showWinnerModal && Boolean(winner)}
          status={status}
        />
      </div>
      <CardRow
        cards={hand}
        playCard={playCard}
        queuedCard={queuedCard}
        leadSuit={leadSuit}
      />
      <Modal
        centered
        isOpen={showWinnerModal && Boolean(winner)}
        toggle={closeModal}
        onOpened={() => {
          setTimeout(() => {
            closeModal()
          }, 1000)
        }}
      >
        <ModalBody>
          <Container className="text-align-center">
            {winner && (
              <h2 className="mb-3">{`${getWinner({
                winner,
                players,
              })} won!`}</h2>
            )}
            <Button onClick={closeModal}>CLOSE</Button>
          </Container>
        </ModalBody>
      </Modal>
      <Modal centered isOpen={status === "over"}>
        <ModalHeader>
          <Row>
            <Col className="d-flex justify-content-center mb-3">
              <h1>game over</h1>
            </Col>
          </Row>
        </ModalHeader>
        <ModalBody>
          {Object.values(players)
            .sort((a, b) => {
              const aScore =
                gameScore && gameScore[a.playerId] ? gameScore[a.playerId] : 0
              const bScore =
                gameScore && gameScore[b.playerId] ? gameScore[b.playerId] : 0
              if (aScore < bScore) {
                return 1
              }
              if (aScore > bScore) {
                return -1
              }
              return 0
            })
            .map((player) => (
              <Row key={player.playerId}>
                <Col xs="6">
                  <h5>{player.name}</h5>
                </Col>
                <Col xs="6">
                  <h5 style={{ textAlign: "center" }}>
                    {gameScore && gameScore[player.playerId]
                      ? gameScore[player.playerId]
                      : "0"}
                  </h5>
                </Col>
              </Row>
            ))}
          <Row>
            <Col>
              {status === "over" ? (
                <>
                  <div className="mt-3 text-center">
                    <Button
                      color="primary"
                      onClick={() => {
                        router.push("/")
                      }}
                    >
                      HOME
                    </Button>
                  </div>
                  {isHost && (
                    <div className="mt-3 text-center">
                      <Button color="success" onClick={playAgain}>
                        PLAY AGAIN
                      </Button>
                    </div>
                  )}
                  {nextGame && (
                    <div className="mt-3 text-center">
                      <Link href={`/game/${nextGame}`}>JOIN NEXT GAME</Link>
                    </div>
                  )}
                </>
              ) : (
                <Button color="primary" onClick={closeModal}>
                  CLOSE
                </Button>
              )}
            </Col>
          </Row>
        </ModalBody>
      </Modal>
      {(status === "play" || status === "bid") && (
        <TurnChange
          timeLimit={timeLimit}
          playerId={playerId}
          currentPlayer={currentPlayer}
          winner={winner}
          randomPlay={randomPlay}
          yourTurn={yourTurn}
        />
      )}
      {!isMobile && (
        <NotificationController
          showNotification={showYourTurn}
          onClose={() => updateState({ showYourTurn: false })}
          userName={userName}
        />
      )}
    </>
  )
}

export async function getServerSideProps(context) {
  const { gameId } = context.params
  const userAgent = context.req.headers["user-agent"] || ""
  const isMobile = Boolean(
    userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i),
  )
  return { props: { gameId, isMobile } }
}

export default Game
