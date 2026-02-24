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

  test('renders MUI CircularProgress component', () => {
    const { container } = render(<SpinnerComponent loading={true} />)

    // MUI CircularProgress renders with role="progressbar"
    expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument()
  })
})
