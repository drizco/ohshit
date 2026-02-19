interface YourTurnIndicatorProps {
  isYourTurn: boolean
}

/**
 * Invisible marker that signals when it is this player's turn to play a card.
 * When isYourTurn is true, renders a [data-testid="your-turn"] element that
 * components and E2E tests can target without polling external APIs.
 */
const YourTurnIndicator = ({ isYourTurn }: YourTurnIndicatorProps) => {
  if (!isYourTurn) return null
  return <div data-testid="your-turn" aria-hidden="true" />
}

export default YourTurnIndicator
