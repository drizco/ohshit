import { useContext, useEffect } from "react"
import CombinedContext from "../context/CombinedContext"
import useInterval from "../hooks/useInterval"

const Timer = ({ timeLimit, playerId, currentPlayer, randomPlay }) => {
  const { setState, timer } = useContext(CombinedContext)

  useInterval(() => {
    setState((prevState) => {
      return {
        timer: prevState.timer != null ? prevState.timer - 1 : timeLimit,
      }
    })
  }, 1000)

  useEffect(() => {
    const handleZero = async () => {
      if (currentPlayer === playerId) {
        await randomPlay()
      }
    }
    if (timer === 0) {
      handleZero()
    }
  }, [currentPlayer, playerId, randomPlay, timer])

  return null
}

export default Timer
