import React from 'react'

const CombinedContext = React.createContext({})

export const CombinedProvider = CombinedContext.Provider
export const CombinedConsumer = CombinedContext.Consumer
export default CombinedContext
