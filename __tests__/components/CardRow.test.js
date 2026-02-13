import { jest } from '@jest/globals'
import { render, screen, fireEvent } from '../helpers/render'
import CardRow from '@/components/CardRow'

describe('CardRow Component', () => {
  const mockCards = [
    { rank: 13, suit: 'H', cardId: 'card-1', value: 'A' },
    { rank: 12, suit: 'S', cardId: 'card-2', value: 'K' },
    { rank: 5, suit: 'C', cardId: 'card-3', value: '6' },
  ]

  const defaultProps = {
    cards: mockCards,
    playCard: jest.fn(),
    queuedCard: null,
    leadSuit: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders all cards in hand', () => {
    const { container } = render(<CardRow {...defaultProps} />)

    // Should render 3 cards
    const cardElements = container.querySelectorAll('.playing-card')
    expect(cardElements).toHaveLength(3)
  })

  test('displays card values correctly', () => {
    render(<CardRow {...defaultProps} />)

    expect(screen.getByText('A')).toBeInTheDocument() // Ace
    expect(screen.getByText('K')).toBeInTheDocument() // King
    expect(screen.getByText('6')).toBeInTheDocument() // 6
  })

  test('cards are clickable and call playCard', () => {
    const { container } = render(<CardRow {...defaultProps} />)

    const firstCard = container.querySelector('.playing-card')
    fireEvent.click(firstCard)

    expect(defaultProps.playCard).toHaveBeenCalledWith(mockCards[0])
  })

  test('renders with queued card', () => {
    // Just verify it renders without errors when a card is queued
    render(<CardRow {...defaultProps} queuedCard={mockCards[0]} />)

    // Verify the card is still displayed
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  test('applies correct styles for dark mode', () => {
    render(<CardRow {...defaultProps} />, {
      contextValue: {
        dark: true,
      },
    })

    // Just verify it renders without errors in dark mode
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  test('renders empty state when cards array is empty', () => {
    const { container } = render(<CardRow {...defaultProps} cards={[]} />)

    const cardElements = container.querySelectorAll('.playing-card')
    expect(cardElements).toHaveLength(0)
  })

  test('calls playCard for legal cards when lead suit is set', () => {
    const cardsWithMixedSuits = [
      { rank: 13, suit: 'H', cardId: 'card-1', value: 'A' },
      { rank: 12, suit: 'H', cardId: 'card-2', value: 'K' },
      { rank: 5, suit: 'C', cardId: 'card-3', value: '6' },
    ]

    const { container } = render(
      <CardRow {...defaultProps} cards={cardsWithMixedSuits} leadSuit="H" />
    )

    const cardElements = container.querySelectorAll('.playing-card')

    // Click a legal card (Heart)
    fireEvent.click(cardElements[0])
    expect(defaultProps.playCard).toHaveBeenCalledWith(cardsWithMixedSuits[0])

    defaultProps.playCard.mockClear()

    // Click an illegal card (Club when Hearts were led)
    // Component still calls playCard but sets illegalCard state for shake animation
    fireEvent.click(cardElements[2])
    expect(defaultProps.playCard).toHaveBeenCalledWith(cardsWithMixedSuits[2])
  })
})
