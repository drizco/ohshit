// Unit tests for game helper functions
import { jest } from '@jest/globals'
import {
  dealHandsToPlayers,
  rebuildPlayerOrder,
  computeNextNumCards,
} from '../../functions/gameHelpers'
import Deck from '../../functions/deck'

describe('gameHelpers', () => {
  describe('dealHandsToPlayers', () => {
    test('should deal cards to all players', () => {
      const deck = new Deck()
      const players = [
        { playerId: 'p1', name: 'Player 1', present: true },
        { playerId: 'p2', name: 'Player 2', present: true },
      ]
      const hands = dealHandsToPlayers(deck, players, 5)

      expect(Object.keys(hands)).toHaveLength(2)
      expect(hands['p1']).toHaveLength(5)
      expect(hands['p2']).toHaveLength(5)
    })

    test('should deal correct number of cards per player', () => {
      const deck = new Deck()
      const players = [
        { playerId: 'p1', name: 'Player 1', present: true },
        { playerId: 'p2', name: 'Player 2', present: true },
        { playerId: 'p3', name: 'Player 3', present: true },
      ]
      const hands = dealHandsToPlayers(deck, players, 7)

      expect(hands['p1']).toHaveLength(7)
      expect(hands['p2']).toHaveLength(7)
      expect(hands['p3']).toHaveLength(7)
    })

    test('should handle single player', () => {
      const deck = new Deck()
      const players = [{ playerId: 'p1', name: 'Player 1', present: true }]
      const hands = dealHandsToPlayers(deck, players, 10)

      expect(Object.keys(hands)).toHaveLength(1)
      expect(hands['p1']).toHaveLength(10)
    })

    test('should return empty hands object when numCards is 0', () => {
      const deck = new Deck()
      const players = [
        { playerId: 'p1', name: 'Player 1', present: true },
        { playerId: 'p2', name: 'Player 2', present: true },
      ]
      const hands = dealHandsToPlayers(deck, players, 0)

      expect(Object.keys(hands)).toHaveLength(0)
    })
  })

  describe('rebuildPlayerOrder', () => {
    test('should maintain existing player order', () => {
      const oldOrder = ['p1', 'p2', 'p3']
      const players = [
        { playerId: 'p2', name: 'Player 2', present: true },
        { playerId: 'p1', name: 'Player 1', present: true },
        { playerId: 'p3', name: 'Player 3', present: true },
      ]
      const newOrder = rebuildPlayerOrder(oldOrder, players)

      expect(newOrder).toEqual(['p1', 'p2', 'p3'])
    })

    test('should add new players to end', () => {
      const oldOrder = ['p1', 'p2']
      const players = [
        { playerId: 'p1', name: 'Player 1', present: true },
        { playerId: 'p2', name: 'Player 2', present: true },
        { playerId: 'p3', name: 'Player 3', present: true },
      ]
      const newOrder = rebuildPlayerOrder(oldOrder, players)

      expect(newOrder).toEqual(['p1', 'p2', 'p3'])
    })

    test('should filter out absent players', () => {
      const oldOrder = ['p1', 'p2', 'p3']
      const players = [
        { playerId: 'p1', name: 'Player 1', present: true },
        { playerId: 'p2', name: 'Player 2', present: false },
        { playerId: 'p3', name: 'Player 3', present: true },
      ]
      const newOrder = rebuildPlayerOrder(oldOrder, players)

      expect(newOrder).toEqual(['p1', 'p3'])
    })

    test('should handle all players being absent', () => {
      const oldOrder = ['p1', 'p2']
      const players = [
        { playerId: 'p1', name: 'Player 1', present: false },
        { playerId: 'p2', name: 'Player 2', present: false },
      ]
      const newOrder = rebuildPlayerOrder(oldOrder, players)

      expect(newOrder).toEqual([])
    })

    test('should handle mix of old and new players with some absent', () => {
      const oldOrder = ['p1', 'p2', 'p3']
      const players = [
        { playerId: 'p1', name: 'Player 1', present: true },
        { playerId: 'p2', name: 'Player 2', present: false },
        { playerId: 'p3', name: 'Player 3', present: true },
        { playerId: 'p4', name: 'Player 4', present: true },
        { playerId: 'p5', name: 'Player 5', present: false },
      ]
      const newOrder = rebuildPlayerOrder(oldOrder, players)

      expect(newOrder).toEqual(['p1', 'p3', 'p4'])
    })

    test('should handle players with undefined present field as present', () => {
      const oldOrder = ['p1', 'p2']
      const players = [
        { playerId: 'p1', name: 'Player 1' }, // undefined present
        { playerId: 'p2', name: 'Player 2', present: true },
      ]
      const newOrder = rebuildPlayerOrder(oldOrder, players)

      expect(newOrder).toEqual(['p1', 'p2'])
    })

    test('should sort new players alphabetically by playerId', () => {
      const oldOrder = ['p1']
      const players = [
        { playerId: 'p1', name: 'Player 1', present: true },
        { playerId: 'p4', name: 'Player 4', present: true },
        { playerId: 'p2', name: 'Player 2', present: true },
        { playerId: 'p3', name: 'Player 3', present: true },
      ]
      const newOrder = rebuildPlayerOrder(oldOrder, players)

      expect(newOrder).toEqual(['p1', 'p2', 'p3', 'p4'])
    })
  })

  describe('computeNextNumCards', () => {
    test('first advance uses defaultNumCards as baseline (descending)', () => {
      // currentNumCards is null on first advance since startGame doesn't write it to state
      const result = computeNextNumCards(null, 10, true)
      expect(result).toEqual({ numCards: 9, descending: true })
    })

    test('decrements each round while descending', () => {
      expect(computeNextNumCards(9, 10, true)).toEqual({ numCards: 8, descending: true })
      expect(computeNextNumCards(5, 10, true)).toEqual({ numCards: 4, descending: true })
      expect(computeNextNumCards(2, 10, true)).toEqual({ numCards: 1, descending: true })
    })

    test('turnaround: after 1-card round, flips to ascending at 2', () => {
      // currentNumCards = 1, descending → would compute 0, so flips
      const result = computeNextNumCards(1, 10, true)
      expect(result).toEqual({ numCards: 2, descending: false })
    })

    test('increments each round while ascending', () => {
      expect(computeNextNumCards(2, 10, false)).toEqual({ numCards: 3, descending: false })
      expect(computeNextNumCards(6, 10, false)).toEqual({ numCards: 7, descending: false })
      expect(computeNextNumCards(9, 10, false)).toEqual({ numCards: 10, descending: false })
    })

    test('full 10-card game sequence matches expected pattern', () => {
      const expected = [9, 8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      let currentNumCards = null
      let descending = true

      for (const expectedCount of expected) {
        const result = computeNextNumCards(currentNumCards, 10, descending)
        expect(result.numCards).toBe(expectedCount)
        currentNumCards = result.numCards
        descending = result.descending
      }
    })
  })
})
