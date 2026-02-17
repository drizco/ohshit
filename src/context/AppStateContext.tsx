import React from 'react'
import type { AppStateContextValue } from '../types'

const AppStateContext = React.createContext<AppStateContextValue>({
  loading: false,
  setLoading: () => {},
  error: null,
  setError: () => {},
  visible: false,
})

export const AppStateProvider = AppStateContext.Provider
export const AppStateConsumer = AppStateContext.Consumer
export default AppStateContext
