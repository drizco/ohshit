// Tests for utility helper functions
import {
  isLegal,
  calculateLeader,
  getScore,
  getNextPlayer,
  calculateGameScore,
  getAvailableTricks,
  handleDirtyGame,
  getColor,
  getSource,
} from '@/utils/helpers'
import { mockPlayers } from '../fixtures/gameData'

describe('Utility Helpers', () => {
  describe('isLegal', () => {
    test('should allow any card when no lead suit', () => {
      const hand = [
        { rank: 13, suit: 'H' },
        { rank: 5, suit: 'C' },
      ]
      const card = { rank: 5, suit: 'C' }

      expect(isLegal({ hand, card, leadSuit: null })).toBe(true)
    })

    test('should require following suit when player has lead suit', () => {
      const hand = [
        { rank: 13, suit: 'H' },
        { rank: 5, suit: 'C' },
        { rank: 7, suit: 'H' },
      ]
      const validCard = { rank: 13, suit: 'H' }
      const invalidCard = { rank: 5, suit: 'C' }

      expect(isLegal({ hand, card: validCard, leadSuit: 'H' })).toBe(true)
      expect(isLegal({ hand, card: invalidCard, leadSuit: 'H' })).toBe(false)
    })

    test('should allow any suit when player does not have lead suit', () => {
      const hand = [
        { rank: 5, suit: 'C' },
        { rank: 7, suit: 'D' },
      ]
      const card = { rank: 5, suit: 'C' }

      expect(isLegal({ hand, card, leadSuit: 'H' })).toBe(true)
    })

    test('should handle empty hand', () => {
      const hand = []
      const card = { rank: 5, suit: 'C' }

      expect(isLegal({ hand, card, leadSuit: 'H' })).toBe(true)
    })
  })

  describe('calculateLeader', () => {
    test('should select trump card over lead suit', () => {
      const cards = [
        { playerId: 'p1', card: { rank: 13, suit: 'H' } }, // Ace of Hearts (lead)
        { playerId: 'p2', card: { rank: 2, suit: 'S' } }, // 3 of Spades (trump)
      ]

      const leader = calculateLeader({
        cards: cards.map((c) => ({ ...c.card, playerId: c.playerId })),
        trump: 'S',
        leadSuit: 'H',
      })

      expect(leader.playerId).toBe('p2') // Trump wins
    })

    test('should select lead suit over non-lead, non-trump', () => {
      const cards = [
        { playerId: 'p1', card: { rank: 5, suit: 'H' } }, // 6 of Hearts (lead)
        { playerId: 'p2', card: { rank: 13, suit: 'D' } }, // Ace of Diamonds
      ]

      const leader = calculateLeader({
        cards: cards.map((c) => ({ ...c.card, playerId: c.playerId })),
        trump: 'S',
        leadSuit: 'H',
      })

      expect(leader.playerId).toBe('p1') // Lead suit wins
    })

    test('should select highest rank when same suit', () => {
      const cards = [
        { playerId: 'p1', card: { rank: 5, suit: 'H' } },
        { playerId: 'p2', card: { rank: 13, suit: 'H' } },
        { playerId: 'p3', card: { rank: 8, suit: 'H' } },
      ]

      const leader = calculateLeader({
        cards: cards.map((c) => ({ ...c.card, playerId: c.playerId })),
        trump: 'S',
        leadSuit: 'H',
      })

      expect(leader.playerId).toBe('p2') // Highest rank
      expect(leader.rank).toBe(13)
    })

    test('should select highest trump when multiple trumps', () => {
      const cards = [
        { playerId: 'p1', card: { rank: 5, suit: 'S' } },
        { playerId: 'p2', card: { rank: 13, suit: 'S' } },
        { playerId: 'p3', card: { rank: 8, suit: 'H' } },
      ]

      const leader = calculateLeader({
        cards: cards.map((c) => ({ ...c.card, playerId: c.playerId })),
        trump: 'S',
        leadSuit: 'H',
      })

      expect(leader.playerId).toBe('p2') // Highest trump
    })
  })

  describe('getScore', () => {
    test('should count tricks won by each player', () => {
      const tricks = [
        { winner: 'player-1' },
        { winner: 'player-2' },
        { winner: 'player-1' },
        { winner: 'player-1' },
        { winner: 'player-3' },
      ]

      const score = getScore(tricks)

      expect(score['player-1']).toBe(3)
      expect(score['player-2']).toBe(1)
      expect(score['player-3']).toBe(1)
    })

    test('should handle tricks without winners', () => {
      const tricks = [{ winner: 'player-1' }, { winner: null }, { winner: 'player-1' }]

      const score = getScore(tricks)

      expect(score['player-1']).toBe(2)
    })

    test('should return empty object for empty tricks array', () => {
      const score = getScore([])
      expect(score).toEqual({})
    })
  })

  describe('getNextPlayer', () => {
    test('should return next player in list', () => {
      const nextId = getNextPlayer({
        playerId: 'player-1',
        players: mockPlayers,
      })

      expect(nextId).toBe('player-2')
    })

    test('should wrap around to first player', () => {
      const nextId = getNextPlayer({
        playerId: 'player-3',
        players: mockPlayers,
      })

      expect(nextId).toBe('player-1')
    })

    test('should handle single player', () => {
      const players = [{ playerId: 'only-player' }]
      const nextId = getNextPlayer({
        playerId: 'only-player',
        players,
      })

      expect(nextId).toBe('only-player')
    })
  })

  describe('calculateGameScore', () => {
    const players = {
      'player-1': { playerId: 'player-1', name: 'Alice' },
      'player-2': { playerId: 'player-2', name: 'Bob' },
    }

    test('should award 10 + tricks when bid matches tricks won', () => {
      const bids = { 'player-1': 3, 'player-2': 2 }
      const roundScore = { 'player-1': 3, 'player-2': 2 }
      const score = {}

      const result = calculateGameScore({
        players,
        bids,
        roundScore,
        score,
        noBidPoints: false,
      })

      expect(result['player-1']).toBe(13) // 10 + 3
      expect(result['player-2']).toBe(12) // 10 + 2
    })

    test('should only award tricks when bid does not match (noBidPoints=false)', () => {
      const bids = { 'player-1': 3, 'player-2': 2 }
      const roundScore = { 'player-1': 2, 'player-2': 3 }
      const score = {}

      const result = calculateGameScore({
        players,
        bids,
        roundScore,
        score,
        noBidPoints: false,
      })

      expect(result['player-1']).toBe(2) // Just tricks won
      expect(result['player-2']).toBe(3) // Just tricks won
    })

    test('should award nothing when bid does not match (noBidPoints=true)', () => {
      const bids = { 'player-1': 3, 'player-2': 2 }
      const roundScore = { 'player-1': 2, 'player-2': 3 }
      const score = {}

      const result = calculateGameScore({
        players,
        bids,
        roundScore,
        score,
        noBidPoints: true,
      })

      expect(result['player-1']).toBe(0)
      expect(result['player-2']).toBe(0)
    })

    test('should accumulate scores across rounds', () => {
      const bids = { 'player-1': 2 }
      const roundScore = { 'player-1': 2 }
      const score = { 'player-1': 15 }

      const result = calculateGameScore({
        players,
        bids,
        roundScore,
        score,
        noBidPoints: false,
      })

      expect(result['player-1']).toBe(27) // 15 + 10 + 2
    })

    test('should handle zero tricks won', () => {
      const bids = { 'player-1': 0 }
      const roundScore = { 'player-1': 0 }
      const score = {}

      const result = calculateGameScore({
        players,
        bids,
        roundScore,
        score,
        noBidPoints: false,
      })

      expect(result['player-1']).toBe(10) // 10 for making bid
    })
  })

  describe('getAvailableTricks', () => {
    test('should calculate remaining unbid tricks', () => {
      const numCards = 10
      const bids = { 'player-1': 3, 'player-2': 2, 'player-3': 4 }

      const available = getAvailableTricks({ numCards, bids })

      expect(available).toBe(1) // 10 - (3+2+4) = 1
    })

    test('should return negative when overbid', () => {
      const numCards = 5
      const bids = { 'player-1': 3, 'player-2': 3 }

      const available = getAvailableTricks({ numCards, bids })

      expect(available).toBe(-1) // 5 - 6 = -1
    })

    test('should handle no bids yet', () => {
      const numCards = 10
      const bids = {}

      const available = getAvailableTricks({ numCards, bids })

      expect(available).toBe(10)
    })
  })

  describe('handleDirtyGame', () => {
    const players = {
      'player-1': {},
      'player-2': {},
      'player-3': {},
    }

    test('should allow any bid for non-last player', () => {
      const bids = { 'player-1': 2 }

      expect(
        handleDirtyGame({
          value: 5,
          numCards: 10,
          bids,
          players,
        })
      ).toBe(true)
    })

    test('should prevent last player from making clean game', () => {
      const bids = { 'player-1': 3, 'player-2': 4 }
      const numCards = 10

      // Last player cannot bid 3 (would make 10)
      expect(
        handleDirtyGame({
          value: 3,
          numCards,
          bids,
          players,
        })
      ).toBe(false)
    })

    test('should allow last player to make dirty game', () => {
      const bids = { 'player-1': 3, 'player-2': 4 }
      const numCards = 10

      // Last player can bid 2 (makes 9) or 4 (makes 11)
      expect(
        handleDirtyGame({
          value: 2,
          numCards,
          bids,
          players,
        })
      ).toBe(true)

      expect(
        handleDirtyGame({
          value: 4,
          numCards,
          bids,
          players,
        })
      ).toBe(true)
    })

    test('should allow negative available tricks', () => {
      const bids = { 'player-1': 8, 'player-2': 5 }
      const numCards = 10

      // Already overbid, last player can bid anything
      expect(
        handleDirtyGame({
          value: 3,
          numCards,
          bids,
          players,
        })
      ).toBe(true)
    })
  })

  describe('getColor', () => {
    test('should return black for clubs in light mode', () => {
      expect(getColor('C', false)).toBe('#000')
    })

    test('should return black for spades in light mode', () => {
      expect(getColor('S', false)).toBe('#000')
    })

    test('should return red for hearts in light mode', () => {
      expect(getColor('H', false)).toBe('#db0007')
    })

    test('should return red for diamonds in light mode', () => {
      expect(getColor('D', false)).toBe('#db0007')
    })

    test('should return blue for black suits in dark mode', () => {
      expect(getColor('C', true)).toBe('#008ac4')
      expect(getColor('S', true)).toBe('#008ac4')
    })

    test('should return pink for red suits in dark mode', () => {
      expect(getColor('H', true)).toBe('#faa7c4')
      expect(getColor('D', true)).toBe('#faa7c4')
    })
  })

  describe('getSource', () => {
    test('should return correct image paths for light mode', () => {
      expect(getSource('C', false)).toBe('/images/club.png')
      expect(getSource('H', false)).toBe('/images/heart.png')
      expect(getSource('S', false)).toBe('/images/spade.png')
      expect(getSource('D', false)).toBe('/images/diamond.png')
    })

    test('should return dark mode image paths', () => {
      expect(getSource('C', true)).toBe('/images/club-dark.png')
      expect(getSource('H', true)).toBe('/images/heart-dark.png')
      expect(getSource('S', true)).toBe('/images/spade-dark.png')
      expect(getSource('D', true)).toBe('/images/diamond-dark.png')
    })
  })
})
