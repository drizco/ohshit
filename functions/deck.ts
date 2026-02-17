import type { Suit, Card, CardValue } from './types.js'

class Deck {
  suits: Suit[]
  values: CardValue[]
  cards: Card[]

  constructor() {
    this.suits = ['C', 'S', 'H', 'D']
    this.values = [
      { rank: 1, value: '2' },
      { rank: 2, value: '3' },
      { rank: 3, value: '4' },
      { rank: 4, value: '5' },
      { rank: 5, value: '6' },
      { rank: 6, value: '7' },
      { rank: 7, value: '8' },
      { rank: 8, value: '9' },
      { rank: 9, value: '10' },
      { rank: 10, value: 'J' },
      { rank: 11, value: 'Q' },
      { rank: 12, value: 'K' },
      { rank: 13, value: 'A' },
    ]
    this.cards = this.createDeck()
  }

  sortHand(cards: Card[]): Card[] {
    return cards.sort((a, b) => {
      if (a.suit === 'C' && b.suit !== 'C') {
        return -1
      }
      if (b.suit === 'C' && a.suit !== 'C') {
        return 1
      }
      if (a.suit === 'H' && b.suit !== 'H') {
        return -1
      }
      if (b.suit === 'H' && a.suit !== 'H') {
        return 1
      }
      if (a.suit === 'S' && b.suit !== 'S') {
        return -1
      }
      if (b.suit === 'S' && a.suit !== 'S') {
        return 1
      }
      return a.rank - b.rank
    })
  }

  deal(): Card | undefined {
    return this.cards.shift()
  }

  createDeck(): Card[] {
    const cards: Card[] = []
    this.suits.forEach((suit) => {
      this.values.forEach(({ rank, value }) => {
        cards.push({ suit, rank, value })
      })
    })
    return this._shuffle(cards)
  }

  _shuffle(array: Card[]): Card[] {
    let currentIndex = array.length
    let temporaryValue: Card, randomIndex: number

    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex -= 1

      temporaryValue = array[currentIndex]
      array[currentIndex] = array[randomIndex]
      array[randomIndex] = temporaryValue
    }

    return array
  }
}

export default Deck
