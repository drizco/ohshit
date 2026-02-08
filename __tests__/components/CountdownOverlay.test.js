import { render, screen } from '../helpers/render'
import CountdownOverlay from '@/components/CountdownOverlay'

describe('CountdownOverlay Component', () => {
  test('shows countdown number when visible', () => {
    render(<CountdownOverlay timeRemaining={5} isVisible={true} />)

    expect(screen.getByText('5')).toBeInTheDocument()
  })

  test('does not render when isVisible is false', () => {
    const { container } = render(<CountdownOverlay timeRemaining={5} isVisible={false} />)

    expect(container.firstChild).toBeNull()
  })

  test('renders with correct red-text class', () => {
    render(<CountdownOverlay timeRemaining={3} isVisible={true} />)

    const heading = screen.getByText('3')
    expect(heading).toHaveClass('red-text')
    expect(heading.tagName).toBe('H1')
  })

  test('displays different time values', () => {
    const { rerender } = render(<CountdownOverlay timeRemaining={10} isVisible={true} />)
    expect(screen.getByText('10')).toBeInTheDocument()

    rerender(<CountdownOverlay timeRemaining={1} isVisible={true} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  test('handles zero time remaining', () => {
    render(<CountdownOverlay timeRemaining={0} isVisible={true} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
