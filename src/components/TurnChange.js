import { useContext, useEffect, useRef } from "react"
import CombinedContext from "../context/CombinedContext"
import Timer from "./Timer"

const TurnChange = ({
  timeLimit,
  playerId,
  currentPlayer,
  winner,
  randomPlay,
  yourTurn,
}) => {
  const { setState, timer } = useContext(CombinedContext)

  const prevCurrentPlayer = useRef(null)

  useEffect(() => {
    if (currentPlayer) {
      if (currentPlayer !== prevCurrentPlayer.current) {
        setState({ timer: timeLimit })
      } else if (winner) {
        setState({ timer: timeLimit })
      }
      if (currentPlayer === playerId || winner === playerId) {
        yourTurn()
      }
    }
    prevCurrentPlayer.current = currentPlayer
  }, [currentPlayer, playerId, setState, timeLimit, winner, yourTurn])

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
