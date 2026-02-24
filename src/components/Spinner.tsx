import CircularProgress from '@mui/material/CircularProgress'

interface SpinnerComponentProps {
  loading: boolean
}

const SpinnerComponent = ({ loading }: SpinnerComponentProps) => {
  return loading ? (
    <div className="spinner-container">
      <CircularProgress size="3rem" color="primary" />
    </div>
  ) : null
}

export default SpinnerComponent
