import React from "react"
import styles from "../styles/pages/game.module.scss"

/**
 * CountdownOverlay - Displays a large countdown timer overlay
 * Shows a big red number when time is running out
 */
const CountdownOverlay = ({ timeRemaining, isVisible }) => {
  if (!isVisible) {
    return null
  }

  return (
    <div className={styles.countdown}>
      <h1 className="red-text">{timeRemaining}</h1>
    </div>
  )
}

export default CountdownOverlay
