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

const openDrawer = () => {
  fireEvent.click(screen.getByRole('button', { name: /menu/i }))
}

describe('Header Component', () => {
  test('renders header with logo and title', () => {
    render(<Header />)

    expect(screen.getByAltText('Oh Shit Logo')).toBeInTheDocument()
    expect(screen.getByText('oh shit')).toBeInTheDocument()
  })

  test('shows rules button in drawer', () => {
    render(<Header />)
    openDrawer()

    expect(screen.getByRole('button', { name: /rules/i })).toBeInTheDocument()
  })

  test('opens rules modal when rules button is clicked', () => {
    render(<Header />)
    openDrawer()
    fireEvent.click(screen.getByRole('button', { name: /rules/i }))

    expect(screen.getByText(/oh shit is a classic card game/i)).toBeInTheDocument()
  })

  test('closes rules modal when close button is clicked', () => {
    render(<Header />)
    openDrawer()
    fireEvent.click(screen.getByRole('button', { name: /rules/i }))

    expect(screen.getByText(/oh shit is a classic card game/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /close/i }))
  })

  test('toggles sound mute when sound item is clicked', () => {
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
    openDrawer()

    fireEvent.click(screen.getByRole('button', { name: /Mute Sounds/i }))

    expect(setMuteMock).toHaveBeenCalled()
  })

  test('toggles dark mode when theme item is clicked', () => {
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
    openDrawer()

    fireEvent.click(screen.getByRole('button', { name: /Dark Mode/i }))

    expect(setDarkMock).toHaveBeenCalled()
  })

  test('shows unmute option when muted', () => {
    render(<Header />, {
      contextValue: {
        mute: true,
      },
    })
    openDrawer()

    expect(screen.getByRole('button', { name: /Unmute Sounds/i })).toBeInTheDocument()
  })

  test('shows light mode option when in dark mode', () => {
    render(<Header />, {
      contextValue: {
        dark: true,
      },
    })
    openDrawer()

    expect(screen.getByRole('button', { name: /Light Mode/i })).toBeInTheDocument()
  })

  test('logo links to home page', () => {
    render(<Header />)

    const logoLink = screen.getByAltText('Oh Shit Logo').closest('a')
    expect(logoLink).toHaveAttribute('href', '/')
  })
})
