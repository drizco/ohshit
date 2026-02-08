import ShortUniqueId from "short-unique-id";
import Deck from "./deck.js";

const uid = new ShortUniqueId.default({ length: 4 });

export const newGame = async (req, res) => {
  try {
    const { ref, body } = req
    const { game, name, numCards, bidPoints, dirty, timeLimit } = body
    let gameId = uid()
    let unique = false
    while (!unique) {
      // eslint-disable-next-line no-await-in-loop
      unique = await ref(`games/${gameId}`)
        .once("value")
        .then(snap => !snap.exists())
      if (!unique) {
        gameId = uid()
      }
    }
    const playerRef = ref(`players`).push()
    const playerId = playerRef.key
    const updateObj = {}
    updateObj[`games/${gameId}/timestamp`] = new Date()
    updateObj[`games/${gameId}/name`] = game
    updateObj[`games/${gameId}/gameId`] = gameId
    updateObj[`games/${gameId}/status`] = "pending"
    updateObj[`games/${gameId}/dirty`] = dirty
    updateObj[`games/${gameId}/timeLimit`] = timeLimit
    updateObj[`games/${gameId}/noBidPoints`] = !bidPoints
    updateObj[`games/${gameId}/numCards`] = numCards
    updateObj[`players/${playerId}/name`] = name
    updateObj[`players/${playerId}/gameId`] = gameId
    updateObj[`players/${playerId}/host`] = true
    updateObj[`players/${playerId}/playerId`] = playerId
    await ref().update(updateObj)
    return res.status(200).send({ playerId, gameId })
  } catch (error) {
    console.log(`$$>>>>: exports.newGame -> error`, error)
    return res.sendStatus(500)
  }
}

export const replayGame = async (req, res) => {
  try {
    const { ref, body } = req
    const { oldGameId, newGameId } = body
    await ref(`games/${oldGameId}`).update({ nextGame: newGameId })
    return res.sendStatus(200)
  } catch (error) {
    console.log(`$$>>>>: export const replayGame -> error`, error)
    return res.sendStatus(500)
  }
}

export const startGame = async (req, res) => {
  try {
    const {
      ref,
      body: { gameId }
    } = req
    let [players, numCards] = await Promise.all([
      ref("players")
        .orderByChild("gameId")
        .equalTo(gameId)
        .once("value")
        .then(snap => snap.val()),
      ref(`games/${gameId}/numCards`)
        .once("value")
        .then(snap => snap.val())
    ])
    players = Object.values(players)
    const deckSize = 52
    const numPlayers = players.length
    while (numPlayers * numCards > deckSize) {
      numCards--
    }
    const deck = new Deck()

    const hands = {}
    for (let i = numCards; i > 0; i--) {
      players.forEach(player => {
        const card = deck.deal()
        if (hands[player.playerId]) {
          hands[player.playerId].push(card)
        } else {
          hands[player.playerId] = [card]
        }
      })
    }

    const trump = deck.deal().suit

    const roundRef = ref("rounds").push()
    const roundKey = roundRef.key

    const trickRef = ref(`rounds/${roundKey}/tricks`).push()
    const trickKey = trickRef.key

    players = players.map((player, index) => {
      const updatedPlayer = Object.assign({}, player)
      updatedPlayer.nextPlayer = players[index + 1]
        ? players[index + 1].playerId
        : players[0].playerId
      return updatedPlayer
    })

    const randomIndex = Math.floor(Math.random() * numPlayers)
    const dealer = players[randomIndex]

    const updateObj = {}

    players.forEach(player => {
      updateObj[`players/${player.playerId}/nextPlayer`] = player.nextPlayer
    })

    updateObj[`games/${gameId}/numPlayers`] = numPlayers
    updateObj[`games/${gameId}/descending`] = true
    updateObj[`games/${gameId}/roundId`] = roundKey
    updateObj[`games/${gameId}/roundNum`] = 1
    updateObj[`games/${gameId}/numRounds`] = numCards * 2 - 1
    updateObj[`games/${gameId}/currentPlayer`] = dealer.nextPlayer
    updateObj[`games/${gameId}/dealer`] = dealer.playerId
    updateObj[`games/${gameId}/status`] = "bid"
    updateObj[`rounds/${roundKey}/roundId`] = roundKey
    updateObj[`rounds/${roundKey}/numPlayers`] = numPlayers
    updateObj[`rounds/${roundKey}/trump`] = trump
    updateObj[`rounds/${roundKey}/gameId`] = gameId
    updateObj[`rounds/${roundKey}/tricks/${trickKey}/trickId`] = trickKey

    Object.keys(hands).forEach(playerId => {
      const hand = hands[playerId]
      const sortedHand = deck.sortHand(hand)
      updateObj[`hands/${playerId}/gameId`] = gameId
      sortedHand.forEach(card => {
        const cardRef = ref(`hands/${playerId}/rounds/${roundKey}/cards`).push()
        const cardId = cardRef.key
        updateObj[
          `hands/${playerId}/rounds/${roundKey}/cards/${cardId}`
        ] = Object.assign({}, card, {
          cardId,
          playerId
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

export const submitBid = async (req, res) => {
  try {
    const { ref, body } = req
    const { playerId, bid, nextPlayerId, gameId, allBidsIn, roundId } = body
    const updateObj = {}

    updateObj[`rounds/${roundId}/bids/${playerId}`] = Number(bid)
    updateObj[`games/${gameId}/currentPlayer`] = nextPlayerId
    if (allBidsIn) {
      updateObj[`games/${gameId}/status`] = "play"
    }
    await ref().update(updateObj)
    return res.sendStatus(200)
  } catch (error) {
    console.error(`$$>>>>: submitBid -> error`, error)
    return res.sendStatus(500)
  }
}

export const playCard = async (req, res) => {
  try {
    const { ref, body } = req
    const {
      playerId,
      nextPlayerId,
      card,
      leader,
      allCardsIn,
      gameId,
      roundId,
      trickId,
      leadSuit,
      nextRound
    } = body
    const updateObj = {}
    if (leadSuit) {
      updateObj[`rounds/${roundId}/tricks/${trickId}/leadSuit`] = leadSuit
    }
    updateObj[`rounds/${roundId}/tricks/${trickId}/cards/${playerId}`] = card
    updateObj[`rounds/${roundId}/tricks/${trickId}/leader`] = leader
    updateObj[`games/${gameId}/currentPlayer`] = nextPlayerId
    updateObj[`hands/${playerId}/rounds/${roundId}/cards/${card.cardId}`] = null
    if (allCardsIn) {
      updateObj[`games/${gameId}/currentPlayer`] = leader
      updateObj[`rounds/${roundId}/tricks/${trickId}/winner`] = leader

      if (!nextRound) {
        const trickRef = ref(`rounds/${roundId}/tricks`).push()
        const trickKey = trickRef.key
        updateObj[`rounds/${roundId}/tricks/${trickKey}/trickId`] = trickKey
      }
    }
    await ref().update(updateObj)
    return res.sendStatus(200)
  } catch (error) {
    console.error(`$$>>>>: playCard -> error`, error)
    return res.sendStatus(500)
  }
}

export const nextRound = async (req, res) => {
  try {
    const { ref, body } = req
    const {
      numCards,
      roundNum,
      descending,
      gameId,
      roundId,
      noBidPoints,
      gameOver,
      dealer
    } = body
    const updateObj = {}
    const promiseArray = []

    const [bidSnap, tricksSnap] = await Promise.all([
      ref(`rounds/${roundId}/bids`).once("value"),
      ref(`rounds/${roundId}/tricks`).orderByKey().once("value")
    ])
    const scoreObj = {}
    const bidObj = bidSnap.val()
    Object.keys(bidObj).forEach(key => {
      scoreObj[key] = { bid: bidObj[key], won: 0 }
    })

    tricksSnap.forEach(trickSnap => {
      const trick = trickSnap.val()
      scoreObj[trick.winner].won += 1
    })

    Object.keys(scoreObj).forEach(playerId => {
      let score = 0
      if (scoreObj[playerId].bid === scoreObj[playerId].won) {
        score += 10
        score += scoreObj[playerId].won
      } else if (!noBidPoints) {
        score += scoreObj[playerId].won
      }
      promiseArray.push(
        ref(`games/${gameId}/score/${playerId}`).transaction(
          oldScore => (oldScore || 0) + score
        )
      )
    })

    if (gameOver) {
      updateObj[`games/${gameId}/status`] = "over"
    } else {
      const deck = new Deck()

      const playersSnap = await ref("players")
        .orderByChild("gameId")
        .equalTo(gameId)
        .once("value")

      const hands = {}
      for (let i = numCards; i > 0; i--) {
        playersSnap.forEach(playerSnap => {
          const player = playerSnap.val()
          const card = deck.deal()
          if (hands[player.playerId]) {
            hands[player.playerId].push(card)
          } else {
            hands[player.playerId] = [card]
          }
        })
      }

      const playersObj = playersSnap.val()
      const newDealer = playersObj[dealer]
      const newCurrentPlayer = playersObj[newDealer.nextPlayer]
      const numPlayers = Object.keys(playersObj).length

      const trump = deck.deal().suit
      const roundRef = ref("rounds").push()
      const roundKey = roundRef.key

      const trickRef = ref(`rounds/${roundKey}/tricks`).push()
      const trickKey = trickRef.key

      updateObj[`games/${gameId}/roundId`] = roundKey
      updateObj[`games/${gameId}/roundNum`] = roundNum
      updateObj[`games/${gameId}/status`] = "bid"
      updateObj[`games/${gameId}/numCards`] = numCards
      updateObj[`games/${gameId}/descending`] = descending
      updateObj[`games/${gameId}/dealer`] = newDealer.playerId
      updateObj[`games/${gameId}/currentPlayer`] = newCurrentPlayer.playerId
      updateObj[`rounds/${roundKey}/roundId`] = roundKey
      updateObj[`rounds/${roundKey}/numPlayers`] = numPlayers
      updateObj[`rounds/${roundKey}/trump`] = trump
      updateObj[`rounds/${roundKey}/gameId`] = gameId
      updateObj[`rounds/${roundKey}/tricks/${trickKey}/trickId`] = trickKey

      Object.keys(hands).forEach(playerId => {
        const hand = hands[playerId]
        const sortedHand = deck.sortHand(hand)
        updateObj[`hands/${playerId}/gameId`] = gameId
        sortedHand.forEach(card => {
          const cardRef = ref(
            `hands/${playerId}/rounds/${roundKey}/cards`
          ).push()
          const cardId = cardRef.key
          updateObj[
            `hands/${playerId}/rounds/${roundKey}/cards/${cardId}`
          ] = Object.assign({}, card, {
            cardId,
            playerId
          })
        })
      })
    }

    promiseArray.push(ref().update(updateObj))
    await Promise.all(promiseArray)
    return res.sendStatus(200)
  } catch (error) {
    console.log(`$$>>>>: export const nextRound -> error`, error)
    return res.sendStatus(500)
  }
}

export const addPlayer = async (req, res) => {
  try {
    const { ref, body } = req
    const { playerName, gameId } = body
    const playerRef = ref("players").push()
    const playerId = playerRef.key
    await playerRef.update({
      name: playerName,
      gameId,
      playerId,
      present: true
    })
    return res.status(200).send({ playerId })
  } catch (error) {
    console.log(`$$>>>>: export const addPlayer -> error`, error)
    return res.sendStatus(500)
  }
}

export const updatePlayer = async (req, res) => {
  try {
    const { ref, params } = req
    const { playerId, gameId, present } = params
    await ref(`players/${playerId}`).update({
      gameId,
      present: present === "true"
    })
    return res.sendStatus(200)
  } catch (error) {
    console.log(`$$>>>>: export const updatePlayer -> error`, error)
    return res.sendStatus(500)
  }
}
