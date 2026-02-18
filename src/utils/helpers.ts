import { BLUE, PINK } from './constants'
import type { Card, Suit, Player, Trick } from '../types'

export const getColor = (suit: Suit, dark: boolean): string => {
  if (suit === 'C' || suit === 'S') {
    return dark ? BLUE : '#000'
  } else {
    return dark ? PINK : '#db0007'
  }
}

export const getSource = (suit: Suit, dark: boolean): string => {
  switch (suit) {
    case 'C':
      return `/images/club${dark ? '-dark' : ''}.png`
    case 'H':
      return `/images/heart${dark ? '-dark' : ''}.png`
    case 'S':
      return `/images/spade${dark ? '-dark' : ''}.png`
    case 'D':
      return `/images/diamond${dark ? '-dark' : ''}.png`
  }
}

interface IsLegalParams {
  hand: Card[]
  card: Card
  leadSuit: Suit | null
}

export const isLegal = ({ hand, card, leadSuit }: IsLegalParams): boolean => {
  if (!leadSuit) return true
  const hasSuit = hand.some((c) => c.suit === leadSuit)
  if (hasSuit) {
    return card.suit === leadSuit
  }
  return true
}

interface CalculateLeaderParams {
  cards: Card[]
  trump: Suit
  leadSuit: Suit
}

export const calculateLeader = ({
  cards,
  trump,
  leadSuit,
}: CalculateLeaderParams): Card =>
  cards.sort((a, b) => {
    if (a.suit === trump && b.suit !== trump) {
      return -1
    }
    if (b.suit === trump && a.suit !== trump) {
      return 1
    }
    if (a.suit === leadSuit && b.suit !== leadSuit) {
      return -1
    }
    if (b.suit === leadSuit && a.suit !== leadSuit) {
      return 1
    }
    return b.rank - a.rank
  })[0]

export const getScore = (tricks: Trick[]): Record<string, number> =>
  tricks.reduce(
    (scoreObj, tr) => {
      const newScoreObj = { ...scoreObj }
      if (tr.winner) {
        if (!newScoreObj[tr.winner]) {
          newScoreObj[tr.winner] = 0
        }
        newScoreObj[tr.winner] += 1
      }
      return newScoreObj
    },
    {} as Record<string, number>
  )

interface PlayerIndexParams {
  currentPlayerIndex: number
  playerOrder: string[]
}

export const getNextPlayerIndex = ({
  currentPlayerIndex,
  playerOrder,
}: PlayerIndexParams): number => {
  return (currentPlayerIndex + 1) % playerOrder.length
}

export const getNextPlayerId = ({
  currentPlayerIndex,
  playerOrder,
}: PlayerIndexParams): string => {
  const nextIndex = getNextPlayerIndex({ currentPlayerIndex, playerOrder })
  return playerOrder[nextIndex]
}

interface GetWinnerParams {
  winner: string
  players: Record<string, Player>
}

export const getWinner = ({ winner, players }: GetWinnerParams): string =>
  players[winner].name

interface CalculateGameScoreParams {
  players: Record<string, Player>
  bids: Record<string, number>
  roundScore: Record<string, number>
  score: Record<string, number>
  noBidPoints: boolean
}

export const calculateGameScore = ({
  players,
  bids,
  roundScore,
  score,
  noBidPoints,
}: CalculateGameScoreParams): Record<string, number> => {
  const newGameScore = { ...score }
  Object.values(players).forEach((player) => {
    const bidsMade = bids[player.playerId]
    const tricksWon = roundScore[player.playerId] || 0
    let newScore = tricksWon && !noBidPoints ? tricksWon : 0
    if (bidsMade === tricksWon) {
      if (noBidPoints) {
        newScore = tricksWon
      }
      newScore += 10
    }
    if (newGameScore[player.playerId]) {
      newGameScore[player.playerId] += newScore
    } else {
      newGameScore[player.playerId] = newScore
    }
  })
  return newGameScore
}

interface AvailableTricksParams {
  numCards: number
  bids: Record<string, number> | null
}

export const getAvailableTricks = ({ numCards, bids }: AvailableTricksParams): number =>
  numCards - Object.values(bids || {}).reduce((num, bid) => num + bid, 0)

interface HandleDirtyGameParams {
  value: number
  numCards: number
  bids: Record<string, number> | null
  players: Record<string, Player> | null
}

export const handleDirtyGame = ({
  value,
  numCards,
  bids,
  players,
}: HandleDirtyGameParams): boolean => {
  const lastPlayer =
    Object.keys(bids || {}).length + 1 === Object.keys(players || {}).length
  if (lastPlayer) {
    const wouldMakeClean = getAvailableTricks({
      numCards,
      bids,
    })
    if (wouldMakeClean < 0) {
      return true
    }
    return wouldMakeClean !== +value
  }
  return true
}
