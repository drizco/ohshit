import type { Dispatch, SetStateAction } from 'react'

export interface SettingsContextValue {
  mute: boolean
  setMute: Dispatch<SetStateAction<boolean>>
  dark: boolean
  setDark: Dispatch<SetStateAction<boolean>>
}

export interface TimerContextValue {
  timer: number
  setTimer: Dispatch<SetStateAction<number>>
}

export interface AppStateContextValue {
  loading: boolean
  setLoading: (loading: boolean) => void
  error: string | null
  setError: (error: string | null) => void
  visible: boolean
}
