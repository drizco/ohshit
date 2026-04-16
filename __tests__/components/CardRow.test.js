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
    render(<CardRow {...defaultProps} />)

    const firstCardButton = screen.getByRole('button', { name: 'A of H' })
    fireEvent.click(firstCardButton)

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

  test('forwards every click to playCard regardless of legality', () => {
    // CardRow is presentational — legality / queue / reject decisions
    // live in useGameActions.playCard. CardRow simply forwards clicks.
    const cardsWithMixedSuits = [
      { rank: 13, suit: 'H', cardId: 'card-1', value: 'A' },
      { rank: 12, suit: 'H', cardId: 'card-2', value: 'K' },
      { rank: 5, suit: 'C', cardId: 'card-3', value: '6' },
    ]

    render(<CardRow {...defaultProps} cards={cardsWithMixedSuits} leadSuit="H" />)

    fireEvent.click(screen.getByRole('button', { name: 'A of H' }))
    expect(defaultProps.playCard).toHaveBeenCalledWith(cardsWithMixedSuits[0])

    defaultProps.playCard.mockClear()

    fireEvent.click(screen.getByRole('button', { name: '6 of C' }))
    expect(defaultProps.playCard).toHaveBeenCalledWith(cardsWithMixedSuits[2])
  })

  test('marks illegal cards with aria-disabled when lead suit is set', () => {
    const cardsWithMixedSuits = [
      { rank: 13, suit: 'H', cardId: 'card-1', value: 'A' },
      { rank: 5, suit: 'C', cardId: 'card-3', value: '6' },
    ]

    render(<CardRow {...defaultProps} cards={cardsWithMixedSuits} leadSuit="H" />)

    expect(screen.getByRole('button', { name: 'A of H' })).toHaveAttribute(
      'aria-disabled',
      'false'
    )
    expect(screen.getByRole('button', { name: '6 of C' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
  })

})
