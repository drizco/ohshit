import React from 'react'
import styles from '../styles/pages/game.module.scss'

interface CountdownOverlayProps {
  timeRemaining: number
  isVisible: boolean
}

/**
 * CountdownOverlay - Displays a large countdown timer overlay
 * Shows a big red number when time is running out
 */
const CountdownOverlay = ({ timeRemaining, isVisible }: CountdownOverlayProps) => {
  if (!isVisible) {
    return null
  }

  return (
    <div className={styles.countdown}>
      <div className={styles.suit_red}>{timeRemaining}</div>
    </div>
  )
}

export default CountdownOverlay
