// Component tests for Spinner
import { render } from '../helpers/render'
import SpinnerComponent from '@/components/Spinner'

describe('Spinner Component', () => {
  test('renders spinner when loading is true', () => {
    const { container } = render(<SpinnerComponent loading={true} />)

    expect(container.querySelector('.spinner-container')).toBeInTheDocument()
  })

  test('does not render spinner when loading is false', () => {
    const { container } = render(<SpinnerComponent loading={false} />)

    expect(container.querySelector('.spinner-container')).not.toBeInTheDocument()
  })

  test('applies dark mode styles when dark context is true', () => {
    const { container } = render(<SpinnerComponent loading={true} />, {
      contextValue: {
        dark: true,
      },
    })

    const spinnerContainer = container.querySelector('.spinner-container')
    expect(spinnerContainer).toHaveStyle({
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    })
  })

  test('applies light mode styles when dark context is false', () => {
    const { container } = render(<SpinnerComponent loading={true} />, {
      contextValue: {
        dark: false,
      },
    })

    const spinnerContainer = container.querySelector('.spinner-container')
    expect(spinnerContainer).toHaveStyle({
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    })
  })

  test('renders reactstrap Spinner component', () => {
    const { container } = render(<SpinnerComponent loading={true} />)

    // Reactstrap Spinner renders with class 'spinner-border'
    expect(container.querySelector('.spinner-border')).toBeInTheDocument()
  })
})
