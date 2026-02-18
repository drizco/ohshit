import ShortUniqueId from 'short-unique-id'
import type { Request, Response } from 'express'
import type { database } from 'firebase-admin'
import Deck from './deck.js'
import { calculateLeader, isLegal, calculateScore, getNextPlayerIndex } from './helpers.js'
import type { Card, Player } from './types.js'
import {
  dealHandsToPlayers,
  writeHandsToDatabase,
  createRoundAndTrick,
  rebuildPlayerOrder,
  computeNextNumCards,
} from './gameHelpers.js'
import {
  sendError,
  sendSuccess,
  validatePlayerTurn,
  handleFunctionError,
  getFirebaseValue,
} from './databaseHelpers.js'

const uid = new ShortUniqueId({ length: 4 })

interface RequestWithRef extends Request {
  ref: (path?: string) => database.Reference
}

export const newGame = async (req: RequestWithRef, res: Response): Promise<Response> => {
  try {
    const { ref, body } = req
    const { game, name, numCards, bidPoints, dirty, timeLimit } = body
    let gameId = uid.rnd()
    let unique = false
    while (!unique) {
      // eslint-disable-next-line no-await-in-loop
      unique = await ref(`games/${gameId}`)
        .once('value')
        .then((snap) => !snap.exists())
      if (!unique) {
        gameId = uid.rnd()
      }
    }
    const playerRef = ref(`games/${gameId}/players`).push()
    const playerId = playerRef.key as string
    const updateObj: Record<string, unknown> = {}
    // Metadata
    updateObj[`games/${gameId}/metadata/timestamp`] = new Date()
    updateObj[`games/${gameId}/metadata/name`] = game
    updateObj[`games/${gameId}/metadata/gameId`] = gameId
    // Settings
    updateObj[`games/${gameId}/settings/numCards`] = numCards
    updateObj[`games/${gameId}/settings/dirty`] = dirty
    updateObj[`games/${gameId}/settings/timeLimit`] = timeLimit
    updateObj[`games/${gameId}/settings/noBidPoints`] = !bidPoints
    // State
    updateObj[`games/${gameId}/state/status`] = 'pending'
    // Player
    updateObj[`games/${gameId}/players/${playerId}/name`] = name
    updateObj[`games/${gameId}/players/${playerId}/host`] = true
    updateObj[`games/${gameId}/players/${playerId}/playerId`] = playerId
    updateObj[`games/${gameId}/players/${playerId}/present`] = true
    await ref().update(updateObj)
    return sendSuccess(res, { playerId, gameId })
  } catch (error) {
    return handleFunctionError(res, 'newGame', error)
  }
}

export const replayGame = async (
  req: RequestWithRef,
  res: Response
): Promise<Response> => {
  try {
    const { ref, body } = req
    const { oldGameId, newGameId } = body
    await ref(`games/${oldGameId}/state`).update({ nextGame: newGameId })
    return sendSuccess(res)
  } catch (error) {
    return handleFunctionError(res, 'replayGame', error)
  }
}

export const startGame = async (
  req: RequestWithRef,
  res: Response
): Promise<Response> => {
  try {
    const {
      ref,
      body: { gameId },
    } = req
    let [players, numCards] = await Promise.all([
      getFirebaseValue(ref, `games/${gameId}/players`),
      getFirebaseValue(ref, `games/${gameId}/settings/numCards`),
    ])
    players = Object.values(players) as Player[]
    const deckSize = 52
    const numPlayers = players.length
    // reserve 1 for trump
    while (numPlayers * numCards > deckSize - 1) {
      numCards--
    }
    const deck = new Deck()

    const hands = dealHandsToPlayers(deck, players, numCards)

    const trumpCard = deck.deal()
    if (!trumpCard) {
      return sendError(res, 500, 'Failed to draw trump card')
    }
    const trump = trumpCard.suit

    const { roundKey, trickKey } = createRoundAndTrick(ref, gameId)

    const randomIndex = Math.floor(Math.random() * numPlayers)
    const dealerIndex = randomIndex

    // Build player order array
    const playerOrder = players.map((p: Player) => p.playerId)

    const updateObj: Record<string, unknown> = {}

    // State updates
    updateObj[`games/${gameId}/state/numPlayers`] = numPlayers
    updateObj[`games/${gameId}/state/descending`] = true
    updateObj[`games/${gameId}/state/roundId`] = roundKey
    updateObj[`games/${gameId}/state/roundNum`] = 1
    updateObj[`games/${gameId}/state/numRounds`] = numCards * 2 - 1
    updateObj[`games/${gameId}/state/dealerIndex`] = dealerIndex
    updateObj[`games/${gameId}/state/currentPlayerIndex`] = getNextPlayerIndex(
      dealerIndex,
      numPlayers
    )
    updateObj[`games/${gameId}/state/playerOrder`] = playerOrder
    updateObj[`games/${gameId}/state/status`] = 'bid'

    // Round setup
    updateObj[`games/${gameId}/rounds/${roundKey}/roundId`] = roundKey
    updateObj[`games/${gameId}/rounds/${roundKey}/roundNum`] = 1
    updateObj[`games/${gameId}/rounds/${roundKey}/numPlayers`] = numPlayers
    updateObj[`games/${gameId}/rounds/${roundKey}/trump`] = trump
    updateObj[`games/${gameId}/rounds/${roundKey}/tricks/${trickKey}/trickId`] = trickKey

    // Deal hands
    writeHandsToDatabase(updateObj, ref, gameId, roundKey, hands, deck)

    await ref().update(updateObj)
    return sendSuccess(res)
  } catch (error) {
    return handleFunctionError(res, 'startGame', error)
  }
}

export const submitBid = async (
  req: RequestWithRef,
  res: Response
): Promise<Response> => {
  try {
    const { ref, body } = req
    const { playerId, bid, gameId, roundId } = body
    const updateObj: Record<string, unknown> = {}

    const [playerOrder, currentPlayerIndex, currentBids] = await Promise.all([
      getFirebaseValue(ref, `games/${gameId}/state/playerOrder`),
      getFirebaseValue(ref, `games/${gameId}/state/currentPlayerIndex`),
      getFirebaseValue(ref, `games/${gameId}/rounds/${roundId}/bids`).then(
        (val) => val || {}
      ),
    ])

    try {
      validatePlayerTurn(playerOrder, currentPlayerIndex, playerId)
    } catch (error) {
      return sendError(res, 400, 'Not your turn')
    }

    if (currentBids[playerId] !== undefined) {
      return sendError(res, 400, 'Already submitted bid')
    }

    const nextPlayerIndex = getNextPlayerIndex(currentPlayerIndex, playerOrder.length)
    const numPlayers = playerOrder.length

    const allBidsIn = Object.keys(currentBids).length === numPlayers - 1

    updateObj[`games/${gameId}/rounds/${roundId}/bids/${playerId}`] = Number(bid)
    updateObj[`games/${gameId}/state/currentPlayerIndex`] = nextPlayerIndex
    if (allBidsIn) {
      updateObj[`games/${gameId}/state/status`] = 'play'
    }
    await ref().update(updateObj)
    return sendSuccess(res)
  } catch (error) {
    return handleFunctionError(res, 'submitBid', error)
  }
}

export const playCard = async (req: RequestWithRef, res: Response): Promise<Response> => {
  try {
    const { ref, body } = req
    const { playerId, card, gameId, roundId, trickId } = body

    const [playerOrder, currentPlayerIndex, gameState, trump, currentTrick, playerHand] =
      await Promise.all([
        getFirebaseValue(ref, `games/${gameId}/state/playerOrder`),
        getFirebaseValue(ref, `games/${gameId}/state/currentPlayerIndex`),
        getFirebaseValue(ref, `games/${gameId}/state`),
        getFirebaseValue(ref, `games/${gameId}/rounds/${roundId}/trump`),
        getFirebaseValue(ref, `games/${gameId}/rounds/${roundId}/tricks/${trickId}`).then(
          (val) => val || {}
        ),
        getFirebaseValue(
          ref,
          `games/${gameId}/players/${playerId}/hands/${roundId}/cards`
        ).then((cards) => {
          cards = cards || {}
          return Object.values(cards) as Card[]
        }),
      ])

    try {
      validatePlayerTurn(playerOrder, currentPlayerIndex, playerId)
    } catch (error) {
      return sendError(res, 400, 'Not your turn')
    }

    const cardInHand = playerHand.find((c: Card) => c.cardId === card.cardId)
    if (!cardInHand) {
      return sendError(res, 400, 'Card not in hand')
    }

    const trickCards = Object.values(currentTrick.cards ?? {}) as Card[]
    let leadSuit = currentTrick.leadSuit
    if (!leadSuit && trickCards.length === 0) {
      leadSuit = card.suit
    }

    if (!isLegal({ hand: playerHand, card, leadSuit })) {
      return sendError(res, 400, 'Illegal card play')
    }

    const allCards = [...trickCards, card]
    const allCardsIn = allCards.length === gameState.numPlayers
    const isNextRound = allCardsIn && playerHand.length === 1

    const winningCard = calculateLeader({
      cards: allCards,
      trump,
      leadSuit,
    })
    const leader = winningCard ? winningCard.playerId : null

    const nextPlayerIndex = getNextPlayerIndex(currentPlayerIndex, playerOrder.length)

    const updateObj: Record<string, unknown> = {}
    if (leadSuit && !currentTrick.leadSuit) {
      updateObj[`games/${gameId}/rounds/${roundId}/tricks/${trickId}/leadSuit`] = leadSuit
    }
    updateObj[`games/${gameId}/rounds/${roundId}/tricks/${trickId}/cards/${playerId}`] =
      card
    updateObj[`games/${gameId}/rounds/${roundId}/tricks/${trickId}/leader`] = leader
    updateObj[`games/${gameId}/state/currentPlayerIndex`] = nextPlayerIndex
    updateObj[
      `games/${gameId}/players/${playerId}/hands/${roundId}/cards/${card.cardId}`
    ] = null

    if (allCardsIn) {
      // Set currentPlayerIndex to the winner (leader)
      const winnerIndex = playerOrder.indexOf(leader)
      updateObj[`games/${gameId}/state/currentPlayerIndex`] = winnerIndex
      updateObj[`games/${gameId}/rounds/${roundId}/tricks/${trickId}/winner`] = leader

      if (!isNextRound) {
        const trickRef = ref(`games/${gameId}/rounds/${roundId}/tricks`).push()
        const trickKey = trickRef.key as string
        updateObj[`games/${gameId}/rounds/${roundId}/tricks/${trickKey}/trickId`] =
          trickKey
      }
    }
    await ref().update(updateObj)

    if (isNextRound) {
      await advanceToNextRound(ref, gameId)
    }

    return sendSuccess(res)
  } catch (error) {
    return handleFunctionError(res, 'playCard', error)
  }
}

const advanceToNextRound = async (
  ref: (path?: string) => database.Reference,
  gameId: string
): Promise<void> => {
  const updateObj: Record<string, unknown> = {}
  const promiseArray: Promise<unknown>[] = []

  const gameState = await getFirebaseValue(ref, `games/${gameId}/state`)
  const gameSettings = await getFirebaseValue(ref, `games/${gameId}/settings`)

  const {
    numCards: currentNumCards,
    roundNum: currentRoundNum,
    descending: currentDescending,
    dealerIndex: currentDealerIndex,
    numRounds,
    roundId,
    playerOrder,
  } = gameState
  const { noBidPoints } = gameSettings

  const roundNum = currentRoundNum + 1
  const { numCards, descending } = computeNextNumCards(
    currentNumCards,
    gameSettings.numCards,
    currentDescending
  )

  const gameOver = roundNum > numRounds

  const [bidSnap, tricksSnap] = await Promise.all([
    ref(`games/${gameId}/rounds/${roundId}/bids`).once('value'),
    ref(`games/${gameId}/rounds/${roundId}/tricks`).orderByKey().once('value'),
  ])
  const scoreObj: Record<string, { bid: number; won: number }> = {}
  const bidObj = bidSnap.val()
  Object.keys(bidObj).forEach((key) => {
    scoreObj[key] = { bid: bidObj[key], won: 0 }
  })

  tricksSnap.forEach((trickSnap) => {
    const trick = trickSnap.val()
    scoreObj[trick.winner].won += 1
  })

  Object.keys(scoreObj).forEach((playerId) => {
    const { bid, won } = scoreObj[playerId]
    const score = calculateScore(bid, won, noBidPoints)
    promiseArray.push(
      ref(`games/${gameId}/players/${playerId}/score`).transaction(
        (oldScore) => (oldScore || 0) + score
      )
    )
  })

  if (gameOver) {
    updateObj[`games/${gameId}/state/status`] = 'over'
  } else {
    const deck = new Deck()

    const playersObj = await getFirebaseValue(ref, `games/${gameId}/players`)
    const players = Object.values(playersObj) as Player[]

    // Rebuild playerOrder to include late-joining players and filter out absent players
    const updatedPlayerOrder = rebuildPlayerOrder(playerOrder, players)
    const numPlayers = updatedPlayerOrder.length

    // Validate minimum player count
    if (numPlayers < 2) {
      throw new Error('Not enough players to continue the game')
    }

    const presentPlayers = players.filter((p) => p.present !== false)

    const hands = dealHandsToPlayers(deck, presentPlayers, numCards)
    const newDealerIndex = getNextPlayerIndex(currentDealerIndex, numPlayers)
    const newCurrentPlayerIndex = getNextPlayerIndex(newDealerIndex, numPlayers)

    const trumpCard = deck.deal()
    if (!trumpCard) {
      throw new Error('Failed to draw trump card')
    }
    const trump = trumpCard.suit
    const { roundKey, trickKey } = createRoundAndTrick(ref, gameId)

    updateObj[`games/${gameId}/state/roundId`] = roundKey
    updateObj[`games/${gameId}/state/roundNum`] = roundNum
    updateObj[`games/${gameId}/state/status`] = 'bid'
    updateObj[`games/${gameId}/state/numCards`] = numCards
    updateObj[`games/${gameId}/state/descending`] = descending
    updateObj[`games/${gameId}/state/dealerIndex`] = newDealerIndex
    updateObj[`games/${gameId}/state/currentPlayerIndex`] = newCurrentPlayerIndex
    updateObj[`games/${gameId}/state/playerOrder`] = updatedPlayerOrder
    updateObj[`games/${gameId}/state/numPlayers`] = numPlayers
    updateObj[`games/${gameId}/rounds/${roundKey}/roundId`] = roundKey
    updateObj[`games/${gameId}/rounds/${roundKey}/roundNum`] = roundNum
    updateObj[`games/${gameId}/rounds/${roundKey}/numPlayers`] = numPlayers
    updateObj[`games/${gameId}/rounds/${roundKey}/trump`] = trump
    updateObj[`games/${gameId}/rounds/${roundKey}/tricks/${trickKey}/trickId`] = trickKey

    writeHandsToDatabase(updateObj, ref, gameId, roundKey, hands, deck)
  }

  promiseArray.push(ref().update(updateObj))
  await Promise.all(promiseArray)
}

export const addPlayer = async (
  req: RequestWithRef,
  res: Response
): Promise<Response> => {
  try {
    const { ref, body } = req
    const { playerName, gameId } = body

    // Validate game exists and is joinable
    const gameState = await getFirebaseValue(ref, `games/${gameId}/state`)

    if (!gameState) {
      return sendError(res, 404, 'Game not found')
    }

    if (gameState.status === 'over') {
      return sendError(res, 400, 'Game has ended')
    }

    const playerRef = ref(`games/${gameId}/players`).push()
    const playerId = playerRef.key as string
    await playerRef.update({
      name: playerName,
      playerId,
      present: true,
    })
    return sendSuccess(res, { playerId })
  } catch (error) {
    return handleFunctionError(res, 'addPlayer', error)
  }
}

export const updatePlayer = async (
  req: RequestWithRef,
  res: Response
): Promise<Response> => {
  try {
    const { ref, params } = req
    const { playerId, gameId, present } = params
    await ref(`games/${gameId}/players/${playerId}`).update({
      present: present === 'true',
    })
    return sendSuccess(res)
  } catch (error) {
    return handleFunctionError(res, 'updatePlayer', error)
  }
}
