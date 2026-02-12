import React from "react"

const TimerContext = React.createContext({})

export const TimerProvider = TimerContext.Provider
export const TimerConsumer = TimerContext.Consumer
export default TimerContext
