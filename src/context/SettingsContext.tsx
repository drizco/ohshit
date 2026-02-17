import React from 'react'
import type { SettingsContextValue } from '../types'

const SettingsContext = React.createContext<SettingsContextValue>({
  mute: false,
  setMute: () => {},
  dark: false,
  setDark: () => {},
})

export const SettingsProvider = SettingsContext.Provider
export const SettingsConsumer = SettingsContext.Consumer
export default SettingsContext
