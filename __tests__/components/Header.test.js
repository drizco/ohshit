// Component tests for Header
import { jest } from '@jest/globals'
import { render, screen, fireEvent } from '../helpers/render'
import Header from '@/components/Header'

// Mock Next.js Link
jest.mock('next/link', () => {
  return function Link({ children, href, className }) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }
})

describe('Header Component', () => {
  test('renders header with logo and title', () => {
    render(<Header />)

    expect(screen.getByAltText('Oh Shit Logo')).toBeInTheDocument()
    expect(screen.getByText('oopsie poopsie...')).toBeInTheDocument()
  })

  test('shows rules button', () => {
    render(<Header />)

    const rulesButton = screen.getByRole('button', { name: /rules/i })
    expect(rulesButton).toBeInTheDocument()
  })

  test('opens rules modal when rules button is clicked', () => {
    render(<Header />)

    const rulesButton = screen.getByRole('button', { name: /rules/i })
    fireEvent.click(rulesButton)

    // Modal should be open
    expect(screen.getByText(/oopsie poopsie is a version/i)).toBeInTheDocument()
  })

  test('closes rules modal when toggle is clicked', () => {
    render(<Header />)

    // Open modal
    const rulesButton = screen.getByRole('button', { name: /rules/i })
    fireEvent.click(rulesButton)

    expect(screen.getByText(/oopsie poopsie is a version/i)).toBeInTheDocument()

    // Close modal - find the close button in the modal header
    const closeButtons = screen.getAllByRole('button')
    const modalCloseButton = closeButtons.find(
      (btn) =>
        btn.className.includes('btn-close') || btn.getAttribute('aria-label') === 'Close'
    )

    if (modalCloseButton) {
      fireEvent.click(modalCloseButton)
    }
  })

  test('toggles sound mute when sound icon is clicked', () => {
    const setMuteMock = jest.fn((updater) => {
      if (typeof updater === 'function') {
        updater(false)
      }
    })

    render(<Header />, {
      contextValue: {
        mute: false,
        setMute: setMuteMock,
      },
    })

    const soundButton = screen.getByTitle(/Notification sounds active/i)
    fireEvent.click(soundButton)

    expect(setMuteMock).toHaveBeenCalled()
  })

  test('toggles dark mode when theme icon is clicked', () => {
    const setDarkMock = jest.fn((updater) => {
      if (typeof updater === 'function') {
        updater(false)
      }
    })

    render(<Header />, {
      contextValue: {
        dark: false,
        setDark: setDarkMock,
      },
    })

    const themeButton = screen.getByTitle(/Dark mode/i)
    fireEvent.click(themeButton)

    expect(setDarkMock).toHaveBeenCalled()
  })

  test('shows correct icon for muted state', () => {
    render(<Header />, {
      contextValue: {
        mute: true,
      },
    })

    expect(screen.getByTitle(/Notification sounds muted/i)).toBeInTheDocument()
  })

  test('shows correct icon for dark mode', () => {
    render(<Header />, {
      contextValue: {
        dark: true,
      },
    })

    expect(screen.getByTitle(/Light mode/i)).toBeInTheDocument()
  })

  test('logo links to home page', () => {
    render(<Header />)

    const logoLink = screen.getByAltText('Oh Shit Logo').closest('a')
    expect(logoLink).toHaveAttribute('href', '/')
  })
})
