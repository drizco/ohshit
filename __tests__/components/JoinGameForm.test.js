import { jest } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import JoinGameForm from '@/components/JoinGameForm'

describe('JoinGameForm Component', () => {
  const defaultProps = {
    playerName: '',
    onPlayerNameChange: jest.fn(),
    onJoin: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders input field with correct value', () => {
    render(<JoinGameForm {...defaultProps} playerName="TestPlayer" />)

    const input = screen.getByLabelText('User Name')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('TestPlayer')
  })

  test('renders input field with empty value when playerName is null', () => {
    render(<JoinGameForm {...defaultProps} playerName={null} />)

    const input = screen.getByLabelText('User Name')
    expect(input).toHaveValue('')
  })

  test('calls onChange handler when input changes', () => {
    const mockOnChange = jest.fn()
    render(<JoinGameForm {...defaultProps} onPlayerNameChange={mockOnChange} />)

    const input = screen.getByLabelText('User Name')
    fireEvent.change(input, { target: { value: 'NewName' } })

    expect(mockOnChange).toHaveBeenCalledTimes(1)
  })

  test('join button is disabled when no name provided', () => {
    render(<JoinGameForm {...defaultProps} playerName="" />)

    const button = screen.getByRole('button', { name: /join/i })
    expect(button).toBeDisabled()
  })

  test('join button is enabled when name is provided', () => {
    render(<JoinGameForm {...defaultProps} playerName="TestPlayer" />)

    const button = screen.getByRole('button', { name: /join/i })
    expect(button).not.toBeDisabled()
  })

  test('calls onJoin when join button is clicked', () => {
    const mockOnJoin = jest.fn()
    render(<JoinGameForm {...defaultProps} playerName="TestPlayer" onJoin={mockOnJoin} />)

    const button = screen.getByRole('button', { name: /join/i })
    fireEvent.click(button)

    expect(mockOnJoin).toHaveBeenCalledTimes(1)
  })

  test('does not call onJoin when disabled button is clicked', () => {
    const mockOnJoin = jest.fn()
    render(<JoinGameForm {...defaultProps} playerName="" onJoin={mockOnJoin} />)

    const button = screen.getByRole('button', { name: /join/i })
    fireEvent.click(button)

    // Button is disabled, so onClick shouldn't fire
    expect(mockOnJoin).not.toHaveBeenCalled()
  })

  test('renders with correct form structure', () => {
    const { container } = render(<JoinGameForm {...defaultProps} />)

    // Should have Form, FormGroup, Label, Input, and Button
    expect(container.querySelector('form')).toBeInTheDocument()
    expect(container.querySelector('input[name="playerName"]')).toBeInTheDocument()
    expect(container.querySelector('input[id="name"]')).toBeInTheDocument()
  })

  test('input has data-lpignore attribute', () => {
    render(<JoinGameForm {...defaultProps} />)

    const input = screen.getByLabelText('User Name')
    expect(input).toHaveAttribute('data-lpignore', 'true')
  })
})
