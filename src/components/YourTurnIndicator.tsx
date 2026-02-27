import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import { visuallyHidden } from '@mui/utils'
import styles from '../styles/components/your-turn-indicator.module.scss'
import classNames from 'classnames'

interface YourTurnIndicatorProps {
  isYourTurn: boolean
  /** A value that changes every turn (e.g. `${status}-${currentPlayerIndex}-${trickIndex}`).
   *  Ensures the flash fires even when isYourTurn stays true across turns. */
  turnKey: string
}

/**
 * Signals when it is this player's turn. Renders a [data-testid="your-turn"]
 * marker for E2E tests and a full-screen border flash that fades out.
 */
const YourTurnIndicator = ({ isYourTurn, turnKey }: YourTurnIndicatorProps) => {
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (isYourTurn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFlash(true)
      const timeout = setTimeout(() => setFlash(false), 800)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [isYourTurn, turnKey])

  return (
    <>
      {/* for screen readers */}
      <Box role="status" aria-live="polite" aria-atomic="true" sx={visuallyHidden}>
        {flash && isYourTurn ? "It's your turn" : ''}
      </Box>
      {isYourTurn && (
        <div
          className={classNames({ [styles.turnFlash]: flash })}
          data-testid="your-turn"
          aria-hidden="true"
        />
      )}
    </>
  )
}

export default YourTurnIndicator
