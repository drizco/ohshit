import { jest } from '@jest/globals'
import { render } from '../helpers/render'
import TurnChange from '@/components/TurnChange'

describe('TurnChange Component', () => {
  const defaultProps = {
    timeLimit: 60,
    playerId: 'player-1',
    currentPlayer: 'player-2',
    winner: null,
    randomPlay: jest.fn(),
    yourTurn: jest.fn(),
  }

  test('renders without crashing when timer is >= 0', () => {
    const { container } = render(<TurnChange {...defaultProps} />, {
      contextValue: {
        timer: 30,
        setTimer: jest.fn(),
      },
    })

    // Component renders successfully (Timer returns null, so we just check it doesn't error)
    expect(container).toBeInTheDocument()
  })

  test('renders without crashing when timer is < 0', () => {
    const { container } = render(<TurnChange {...defaultProps} />, {
      contextValue: {
        timer: -1,
        setTimer: jest.fn(),
      },
    })

    // Component renders successfully (no timer shown)
    expect(container).toBeInTheDocument()
  })

  test('calls yourTurn when currentPlayer matches playerId', () => {
    const mockYourTurn = jest.fn()

    render(
      <TurnChange
        {...defaultProps}
        playerId="player-1"
        currentPlayer="player-1"
        yourTurn={mockYourTurn}
      />,
      {
        contextValue: {
          timer: 60,
          setTimer: jest.fn(),
        },
      }
    )

    expect(mockYourTurn).toHaveBeenCalled()
  })

  test('calls yourTurn when winner matches playerId', () => {
    const mockYourTurn = jest.fn()

    render(
      <TurnChange
        {...defaultProps}
        playerId="player-1"
        winner="player-1"
        yourTurn={mockYourTurn}
      />,
      {
        contextValue: {
          timer: 60,
          setTimer: jest.fn(),
        },
      }
    )

    expect(mockYourTurn).toHaveBeenCalled()
  })

  test('resets timer when currentPlayer changes', () => {
    const mockSetTimer = jest.fn()

    const { rerender } = render(
      <TurnChange {...defaultProps} currentPlayer="player-1" />,
      {
        contextValue: {
          timer: 30,
          setTimer: mockSetTimer,
        },
      }
    )

    // Change the current player
    rerender(<TurnChange {...defaultProps} currentPlayer="player-2" />, {
      contextValue: {
        timer: 30,
        setTimer: mockSetTimer,
      },
    })

    // setTimer should be called to reset timer to timeLimit
    expect(mockSetTimer).toHaveBeenCalledWith(60)
  })

  test('resets timer when winner changes', () => {
    const mockSetTimer = jest.fn()

    const { rerender } = render(<TurnChange {...defaultProps} winner={null} />, {
      contextValue: {
        timer: 30,
        setTimer: mockSetTimer,
      },
    })

    // Set a winner
    rerender(<TurnChange {...defaultProps} winner="player-1" />, {
      contextValue: {
        timer: 30,
        setTimer: mockSetTimer,
      },
    })

    // setTimer should be called to reset timer
    expect(mockSetTimer).toHaveBeenCalledWith(60)
  })
})
