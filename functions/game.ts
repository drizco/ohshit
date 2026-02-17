import ShortUniqueId from 'short-unique-id'
import type { Request, Response } from 'express'
import type { database } from 'firebase-admin'
import Deck from './deck.js'
import { calculateLeader, isLegal } from './helpers.js'
import type { Card, Player } from './types.js'

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
    return res.status(200).send({ playerId, gameId })
  } catch (error) {
    console.log(`$$>>>>: exports.newGame -> error`, error)
    return res.sendStatus(500)
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
    return res.sendStatus(200)
  } catch (error) {
    console.log(`$$>>>>: export const replayGame -> error`, error)
    return res.sendStatus(500)
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
      ref(`games/${gameId}/players`)
        .once('value')
        .then((snap) => snap.val()),
      ref(`games/${gameId}/settings/numCards`)
        .once('value')
        .then((snap) => snap.val()),
    ])
    players = Object.values(players) as Player[]
    const deckSize = 52
    const numPlayers = players.length
    // reserve 1 for trump
    while (numPlayers * numCards > deckSize - 1) {
      numCards--
    }
    const deck = new Deck()

    const hands: Record<string, Card[]> = {}
    for (let i = numCards; i > 0; i--) {
      players.forEach((player: Player) => {
        const card = deck.deal()
        if (card) {
          if (hands[player.playerId]) {
            hands[player.playerId].push(card)
          } else {
            hands[player.playerId] = [card]
          }
        }
      })
    }

    const trumpCard = deck.deal()
    if (!trumpCard) {
      return res.status(500).json({ error: 'Failed to draw trump card' })
    }
    const trump = trumpCard.suit

    const roundRef = ref(`games/${gameId}/rounds`).push()
    const roundKey = roundRef.key as string

    const trickRef = ref(`games/${gameId}/rounds/${roundKey}/tricks`).push()
    const trickKey = trickRef.key as string

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
    updateObj[`games/${gameId}/state/currentPlayerIndex`] = (dealerIndex + 1) % numPlayers
    updateObj[`games/${gameId}/state/playerOrder`] = playerOrder
    updateObj[`games/${gameId}/state/status`] = 'bid'

    // Round setup
    updateObj[`games/${gameId}/rounds/${roundKey}/roundId`] = roundKey
    updateObj[`games/${gameId}/rounds/${roundKey}/roundNum`] = 1
    updateObj[`games/${gameId}/rounds/${roundKey}/numPlayers`] = numPlayers
    updateObj[`games/${gameId}/rounds/${roundKey}/trump`] = trump
    updateObj[`games/${gameId}/rounds/${roundKey}/tricks/${trickKey}/trickId`] = trickKey

    // Deal hands
    Object.keys(hands).forEach((playerId) => {
      const hand = hands[playerId]
      const sortedHand = deck.sortHand(hand)
      sortedHand.forEach((card) => {
        const cardRef = ref(
          `games/${gameId}/players/${playerId}/hands/${roundKey}/cards`
        ).push()
        const cardId = cardRef.key as string
        updateObj[
          `games/${gameId}/players/${playerId}/hands/${roundKey}/cards/${cardId}`
        ] = Object.assign({}, card, {
          cardId,
          playerId,
        })
      })
    })

    await ref().update(updateObj)
    return res.sendStatus(200)
  } catch (error) {
    console.error(`$$>>>>: startGame -> error`, error)
    return res.sendStatus(500)
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
      ref(`games/${gameId}/state/playerOrder`)
        .once('value')
        .then((snap) => snap.val()),
      ref(`games/${gameId}/state/currentPlayerIndex`)
        .once('value')
        .then((snap) => snap.val()),
      ref(`games/${gameId}/rounds/${roundId}/bids`)
        .once('value')
        .then((snap) => snap.val() || {}),
    ])

    const currentPlayerId = playerOrder[currentPlayerIndex]
    if (currentPlayerId !== playerId) {
      return res.status(400).json({ error: 'Not your turn' })
    }

    if (currentBids[playerId] !== undefined) {
      return res.status(400).json({ error: 'Already submitted bid' })
    }

    const nextPlayerIndex = (currentPlayerIndex + 1) % playerOrder.length
    const numPlayers = playerOrder.length

    const allBidsIn = Object.keys(currentBids).length === numPlayers - 1

    updateObj[`games/${gameId}/rounds/${roundId}/bids/${playerId}`] = Number(bid)
    updateObj[`games/${gameId}/state/currentPlayerIndex`] = nextPlayerIndex
    if (allBidsIn) {
      updateObj[`games/${gameId}/state/status`] = 'play'
    }
    await ref().update(updateObj)
    return res.sendStatus(200)
  } catch (error) {
    console.error(`$$>>>>: submitBid -> error`, error)
    return res.sendStatus(500)
  }
}

export const playCard = async (req: RequestWithRef, res: Response): Promise<Response> => {
  try {
    const { ref, body } = req
    const { playerId, card, gameId, roundId, trickId } = body

    const [playerOrder, currentPlayerIndex, gameState, trump, currentTrick, playerHand] =
      await Promise.all([
        ref(`games/${gameId}/state/playerOrder`)
          .once('value')
          .then((snap) => snap.val()),
        ref(`games/${gameId}/state/currentPlayerIndex`)
          .once('value')
          .then((snap) => snap.val()),
        ref(`games/${gameId}/state`)
          .once('value')
          .then((snap) => snap.val()),
        ref(`games/${gameId}/rounds/${roundId}/trump`)
          .once('value')
          .then((snap) => snap.val()),
        ref(`games/${gameId}/rounds/${roundId}/tricks/${trickId}`)
          .once('value')
          .then((snap) => snap.val() || {}),
        ref(`games/${gameId}/players/${playerId}/hands/${roundId}/cards`)
          .once('value')
          .then((snap) => {
            const cards = snap.val() || {}
            return Object.values(cards) as Card[]
          }),
      ])

    const currentPlayerId = playerOrder[currentPlayerIndex]
    if (currentPlayerId !== playerId) {
      return res.status(400).json({ error: 'Not your turn' })
    }

    const cardInHand = playerHand.find((c: Card) => c.cardId === card.cardId)
    if (!cardInHand) {
      return res.status(400).json({ error: 'Card not in hand' })
    }

    const trickCards = Object.values(currentTrick.cards ?? {}) as Card[]
    let leadSuit = currentTrick.leadSuit
    if (!leadSuit && trickCards.length === 0) {
      leadSuit = card.suit
    }

    if (!isLegal({ hand: playerHand, card, leadSuit })) {
      return res.status(400).json({ error: 'Illegal card play' })
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

    const nextPlayerIndex = (currentPlayerIndex + 1) % playerOrder.length

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

    return res.sendStatus(200)
  } catch (error) {
    console.error(`$$>>>>: playCard -> error`, error)
    return res.sendStatus(500)
  }
}

const advanceToNextRound = async (
  ref: (path?: string) => database.Reference,
  gameId: string
): Promise<void> => {
  const updateObj: Record<string, unknown> = {}
  const promiseArray: Promise<unknown>[] = []

  const gameState = await ref(`games/${gameId}/state`)
    .once('value')
    .then((snap) => snap.val())
  const gameSettings = await ref(`games/${gameId}/settings`)
    .once('value')
    .then((snap) => snap.val())

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

  let descending = currentDescending
  const roundNum = currentRoundNum + 1
  let numCards = descending
    ? (currentNumCards ?? gameSettings.numCards - 1)
    : (currentNumCards ?? gameSettings.numCards + 1)

  // Handle turnaround point (when cards go back up)
  if (numCards < 1) {
    descending = false
    numCards = 2
  }

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
    let score = 0
    if (scoreObj[playerId].bid === scoreObj[playerId].won) {
      score += 10
      score += scoreObj[playerId].won
    } else if (!noBidPoints) {
      score += scoreObj[playerId].won
    }
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

    const playersSnap = await ref(`games/${gameId}/players`).once('value')
    const playersObj = playersSnap.val()
    const players = Object.values(playersObj) as Player[]

    const hands: Record<string, Card[]> = {}
    for (let i = numCards; i > 0; i--) {
      players.forEach((player) => {
        const card = deck.deal()
        if (card) {
          if (hands[player.playerId]) {
            hands[player.playerId].push(card)
          } else {
            hands[player.playerId] = [card]
          }
        }
      })
    }

    const numPlayers = playerOrder.length
    const newDealerIndex = (currentDealerIndex + 1) % numPlayers
    const newCurrentPlayerIndex = (newDealerIndex + 1) % numPlayers

    const trumpCard = deck.deal()
    if (!trumpCard) {
      throw new Error('Failed to draw trump card')
    }
    const trump = trumpCard.suit
    const roundRef = ref(`games/${gameId}/rounds`).push()
    const roundKey = roundRef.key as string

    const trickRef = ref(`games/${gameId}/rounds/${roundKey}/tricks`).push()
    const trickKey = trickRef.key as string

    updateObj[`games/${gameId}/state/roundId`] = roundKey
    updateObj[`games/${gameId}/state/roundNum`] = roundNum
    updateObj[`games/${gameId}/state/status`] = 'bid'
    updateObj[`games/${gameId}/state/numCards`] = numCards
    updateObj[`games/${gameId}/state/descending`] = descending
    updateObj[`games/${gameId}/state/dealerIndex`] = newDealerIndex
    updateObj[`games/${gameId}/state/currentPlayerIndex`] = newCurrentPlayerIndex
    updateObj[`games/${gameId}/rounds/${roundKey}/roundId`] = roundKey
    updateObj[`games/${gameId}/rounds/${roundKey}/roundNum`] = roundNum
    updateObj[`games/${gameId}/rounds/${roundKey}/numPlayers`] = numPlayers
    updateObj[`games/${gameId}/rounds/${roundKey}/trump`] = trump
    updateObj[`games/${gameId}/rounds/${roundKey}/tricks/${trickKey}/trickId`] = trickKey

    Object.keys(hands).forEach((playerId) => {
      const hand = hands[playerId]
      const sortedHand = deck.sortHand(hand)
      sortedHand.forEach((card) => {
        const cardRef = ref(
          `games/${gameId}/players/${playerId}/hands/${roundKey}/cards`
        ).push()
        const cardId = cardRef.key as string
        updateObj[
          `games/${gameId}/players/${playerId}/hands/${roundKey}/cards/${cardId}`
        ] = Object.assign({}, card, {
          cardId,
          playerId,
        })
      })
    })
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
    const playerRef = ref(`games/${gameId}/players`).push()
    const playerId = playerRef.key as string
    await playerRef.update({
      name: playerName,
      playerId,
      present: true,
    })
    return res.status(200).send({ playerId })
  } catch (error) {
    console.log(`$$>>>>: export const addPlayer -> error`, error)
    return res.sendStatus(500)
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
    return res.sendStatus(200)
  } catch (error) {
    console.log(`$$>>>>: export const updatePlayer -> error`, error)
    return res.sendStatus(500)
  }
}
