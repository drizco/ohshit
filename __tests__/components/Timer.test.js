import { jest } from '@jest/globals'
import { render, waitFor } from '../helpers/render'
import Timer from '@/components/Timer'

// Mock the useInterval hook to avoid actual intervals in tests
jest.mock('@/hooks/useInterval', () => {
  return jest.fn(() => {
    // Don't actually run the interval callback in tests
  })
})

describe('Timer Component', () => {
  const defaultProps = {
    timeLimit: 60,
    playerId: 'player-1',
    currentPlayer: 'player-2',
    randomPlay: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders without crashing', () => {
    const { container } = render(<Timer {...defaultProps} />, {
      contextValue: {
        timer: 30,
        setState: jest.fn(),
      },
    })

    // Timer renders null, so container should be empty
    expect(container).toBeInTheDocument()
  })

  test('calls randomPlay when timer reaches 0 and player is current', async () => {
    const mockRandomPlay = jest.fn().mockResolvedValue(undefined)

    render(
      <Timer
        {...defaultProps}
        playerId="player-1"
        currentPlayer="player-1"
        randomPlay={mockRandomPlay}
      />,
      {
        contextValue: {
          timer: 0,
          setState: jest.fn(),
        },
      }
    )

    await waitFor(() => {
      expect(mockRandomPlay).toHaveBeenCalled()
    })
  })

  test('does not call randomPlay when timer is 0 but player is not current', async () => {
    const mockRandomPlay = jest.fn()

    render(
      <Timer
        {...defaultProps}
        playerId="player-1"
        currentPlayer="player-2"
        randomPlay={mockRandomPlay}
      />,
      {
        contextValue: {
          timer: 0,
          setState: jest.fn(),
        },
      }
    )

    await waitFor(() => {
      expect(mockRandomPlay).not.toHaveBeenCalled()
    })
  })

  test('does not call randomPlay when timer is above 0', () => {
    const mockRandomPlay = jest.fn()

    render(
      <Timer
        {...defaultProps}
        playerId="player-1"
        currentPlayer="player-1"
        randomPlay={mockRandomPlay}
      />,
      {
        contextValue: {
          timer: 10,
          setState: jest.fn(),
        },
      }
    )

    expect(mockRandomPlay).not.toHaveBeenCalled()
  })

  test('renders with different time limits', () => {
    const { container } = render(<Timer {...defaultProps} timeLimit={30} />, {
      contextValue: {
        timer: 15,
        setState: jest.fn(),
      },
    })

    expect(container).toBeInTheDocument()
  })

  test('renders when timer is null', () => {
    const { container } = render(<Timer {...defaultProps} />, {
      contextValue: {
        timer: null,
        setState: jest.fn(),
      },
    })

    expect(container).toBeInTheDocument()
  })
})
