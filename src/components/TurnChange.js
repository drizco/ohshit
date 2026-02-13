import { useContext, useEffect, useRef } from 'react'
import TimerContext from '../context/TimerContext'
import Timer from './Timer'

const TurnChange = ({
  timeLimit,
  playerId,
  currentPlayer,
  winner,
  randomPlay,
  yourTurn,
}) => {
  const { setTimer, timer } = useContext(TimerContext)

  const prevCurrentPlayer = useRef(null)

  useEffect(() => {
    if (currentPlayer) {
      if (currentPlayer !== prevCurrentPlayer.current) {
        setTimer(timeLimit)
      } else if (winner) {
        setTimer(timeLimit)
      }
      if (currentPlayer === playerId || winner === playerId) {
        yourTurn()
      }
    }
    prevCurrentPlayer.current = currentPlayer
  }, [currentPlayer, playerId, setTimer, timeLimit, winner, yourTurn])

  return (
    <>
      {timer >= 0 && (
        <Timer
          timeLimit={timeLimit}
          playerId={playerId}
          currentPlayer={currentPlayer}
          randomPlay={randomPlay}
        />
      )}
    </>
  )
}

export default TurnChange
