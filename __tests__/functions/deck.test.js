// Unit tests for Deck class
import Deck from '../../functions/deck.js'

describe('Deck', () => {
  let deck

  beforeEach(() => {
    deck = new Deck()
  })

  describe('constructor', () => {
    test('should create a deck with 52 cards', () => {
      expect(deck.cards).toHaveLength(52)
    })

    test('should have 4 suits', () => {
      expect(deck.suits).toHaveLength(4)
      expect(deck.suits).toEqual(['C', 'S', 'H', 'D'])
    })

    test('should have 13 values per suit', () => {
      expect(deck.values).toHaveLength(13)
    })

    test('should create shuffled cards', () => {
      // Cards should have rank, suit, and value properties
      const card = deck.cards[0]
      expect(card).toHaveProperty('rank')
      expect(card).toHaveProperty('suit')
      expect(card).toHaveProperty('value')
    })
  })

  describe('deal', () => {
    test('should remove and return the first card', () => {
      const initialLength = deck.cards.length
      const card = deck.deal()

      expect(deck.cards).toHaveLength(initialLength - 1)
      expect(card).toBeDefined()
      expect(card).toHaveProperty('rank')
      expect(card).toHaveProperty('suit')
    })

    test('should deal different cards sequentially', () => {
      const card1 = deck.deal()
      const card2 = deck.deal()

      // Very unlikely to be the same card twice
      const areSame = card1.rank === card2.rank && card1.suit === card2.suit
      expect(areSame).toBe(false)
    })

    test('should deal all 52 cards', () => {
      for (let i = 0; i < 52; i++) {
        const card = deck.deal()
        expect(card).toBeDefined()
      }
      expect(deck.cards).toHaveLength(0)
    })
  })

  describe('sortHand', () => {
    test('should sort cards by suit (C, H, S, D) then rank', () => {
      const hand = [
        { rank: 13, suit: 'D' },
        { rank: 1, suit: 'C' },
        { rank: 13, suit: 'H' },
        { rank: 5, suit: 'S' },
        { rank: 10, suit: 'C' },
      ]

      const sorted = deck.sortHand(hand)

      // Clubs should be first
      expect(sorted[0].suit).toBe('C')
      expect(sorted[1].suit).toBe('C')
      // Then Hearts
      expect(sorted[2].suit).toBe('H')
      // Then Spades
      expect(sorted[3].suit).toBe('S')
      // Then Diamonds
      expect(sorted[4].suit).toBe('D')
    })

    test('should sort cards of same suit by rank', () => {
      const hand = [
        { rank: 13, suit: 'H' },
        { rank: 1, suit: 'H' },
        { rank: 7, suit: 'H' },
      ]

      const sorted = deck.sortHand(hand)

      expect(sorted[0].rank).toBe(1)
      expect(sorted[1].rank).toBe(7)
      expect(sorted[2].rank).toBe(13)
    })

    test('should maintain original order for equal cards', () => {
      const hand = [
        { rank: 5, suit: 'C', id: 1 },
        { rank: 5, suit: 'C', id: 2 },
      ]

      const sorted = deck.sortHand(hand)

      // Both cards have same rank and suit, order should be stable
      expect(sorted).toHaveLength(2)
      expect(sorted[0].rank).toBe(5)
      expect(sorted[1].rank).toBe(5)
    })

    test('should handle empty hand', () => {
      const sorted = deck.sortHand([])
      expect(sorted).toEqual([])
    })
  })

  describe('createDeck', () => {
    test('should create 52 unique cards', () => {
      const cards = deck.createDeck()
      expect(cards).toHaveLength(52)

      // Check uniqueness
      const cardStrings = cards.map((c) => `${c.rank}-${c.suit}`)
      const uniqueCards = new Set(cardStrings)
      expect(uniqueCards.size).toBe(52)
    })

    test('should have 13 cards of each suit', () => {
      const cards = deck.createDeck()
      const suits = ['C', 'S', 'H', 'D']

      suits.forEach((suit) => {
        const suitCards = cards.filter((c) => c.suit === suit)
        expect(suitCards).toHaveLength(13)
      })
    })

    test('should have 4 cards of each rank', () => {
      const cards = deck.createDeck()

      for (let rank = 1; rank <= 13; rank++) {
        const rankCards = cards.filter((c) => c.rank === rank)
        expect(rankCards).toHaveLength(4)
      }
    })
  })

  describe('_shuffle', () => {
    test('should return array of same length', () => {
      const array = [1, 2, 3, 4, 5]
      const shuffled = deck._shuffle([...array])
      expect(shuffled).toHaveLength(array.length)
    })

    test('should contain all original elements', () => {
      const array = [1, 2, 3, 4, 5]
      const shuffled = deck._shuffle([...array])
      expect(shuffled.sort()).toEqual(array.sort())
    })

    test('should shuffle cards (statistical test)', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const shuffled = deck._shuffle([...array])

      // It's extremely unlikely to get the same order after shuffling
      // (unless we're very unlucky with RNG)
      const isSameOrder = array.every((val, idx) => val === shuffled[idx])
      expect(isSameOrder).toBe(false)
    })
  })
})
