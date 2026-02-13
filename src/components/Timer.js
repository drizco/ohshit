import { useContext, useEffect } from 'react'
import TimerContext from '../context/TimerContext'
import useInterval from '../hooks/useInterval'

const Timer = ({ timeLimit, playerId, currentPlayer, randomPlay }) => {
  const { setTimer, timer } = useContext(TimerContext)

  useInterval(() => {
    setTimer((prevTimer) => {
      return prevTimer != null ? prevTimer - 1 : timeLimit
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
