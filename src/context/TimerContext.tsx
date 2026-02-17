import React from 'react'
import type { TimerContextValue } from '../types'

const TimerContext = React.createContext<TimerContextValue>({
  timer: 0,
  setTimer: () => {},
})

export const TimerProvider = TimerContext.Provider
export const TimerConsumer = TimerContext.Consumer
export default TimerContext
