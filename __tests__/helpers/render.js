// Test helpers for rendering React components
import { jest } from '@jest/globals'
import { render as rtlRender } from '@testing-library/react'
import CombinedContext from '@/context/CombinedContext'
import { SettingsProvider } from '@/context/SettingsContext'
import { TimerProvider } from '@/context/TimerContext'

/**
 * Custom render function that wraps components with necessary providers
 */
export function render(ui, { contextValue = {}, ...renderOptions } = {}) {
  const defaultContextValue = {
    mute: false,
    setMute: jest.fn(),
    dark: false,
    setDark: jest.fn(),
    loading: false,
    setLoading: jest.fn(),
    error: null,
    setError: jest.fn(),
    timer: 60,
    setTimer: jest.fn(),
    setState: jest.fn(),
  }

  const mergedContextValue = {
    ...defaultContextValue,
    ...contextValue,
  }

  // Settings context values
  const settingsValue = {
    mute: mergedContextValue.mute,
    setMute: mergedContextValue.setMute,
    dark: mergedContextValue.dark,
    setDark: mergedContextValue.setDark,
  }

  // Timer context values
  const timerValue = {
    timer: mergedContextValue.timer,
    setTimer: mergedContextValue.setTimer,
  }

  function Wrapper({ children }) {
    return (
      <CombinedContext.Provider value={mergedContextValue}>
        <SettingsProvider value={settingsValue}>
          <TimerProvider value={timerValue}>{children}</TimerProvider>
        </SettingsProvider>
      </CombinedContext.Provider>
    )
  }

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * Creates mock context value for testing
 */
export function createMockContext(overrides = {}) {
  return {
    mute: false,
    setMute: jest.fn(),
    dark: false,
    setDark: jest.fn(),
    loading: false,
    setLoading: jest.fn(),
    error: null,
    setError: jest.fn(),
    timer: 60,
    setTimer: jest.fn(),
    setState: jest.fn(),
    ...overrides,
  }
}

// Re-export everything from RTL
export * from '@testing-library/react'
