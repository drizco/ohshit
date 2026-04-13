import Button from '@mui/material/Button'
import styles from '../styles/components/number-stepper.module.scss'

interface NumberStepperProps {
  value: number
  onDecrement: () => void
  onIncrement: () => void
  label?: string
  inputId?: string
  inputAriaLabel?: string
  decrementAriaLabel?: string
  incrementAriaLabel?: string
}

const NumberStepper = ({
  value,
  onDecrement,
  onIncrement,
  label,
  inputId,
  inputAriaLabel,
  decrementAriaLabel,
  incrementAriaLabel,
}: NumberStepperProps) => (
  <div className={styles.stepper}>
    {label && (
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
    )}
    <div className={styles.controls}>
      <Button
        variant="outlined"
        color="inherit"
        className={styles.btn}
        onClick={onDecrement}
        aria-label={decrementAriaLabel ?? `Decrease ${label ?? 'value'}`}
      >
        -
      </Button>
      <input
        type="text"
        id={inputId}
        value={value}
        readOnly
        className={styles.value}
        aria-label={inputAriaLabel ?? label ?? 'value'}
      />
      <Button
        variant="outlined"
        color="inherit"
        className={styles.btn}
        onClick={onIncrement}
        aria-label={incrementAriaLabel ?? `Increase ${label ?? 'value'}`}
      >
        +
      </Button>
    </div>
  </div>
)

export default NumberStepper
