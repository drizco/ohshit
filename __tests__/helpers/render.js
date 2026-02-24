// Test helpers for rendering React components
import { jest } from '@jest/globals'
import { render as rtlRender } from '@testing-library/react'
import AppStateContext from '@/context/AppStateContext'
import { SettingsProvider } from '@/context/SettingsContext'

/**
 * Custom render function that wraps components with necessary providers
 */
export function render(ui, { contextValue = {}, ...renderOptions } = {}) {
  const defaultContextValue = {
    // AppState context
    loading: false,
    setLoading: jest.fn(),
    error: null,
    setError: jest.fn(),
    visible: true,
    // Settings context
    mute: false,
    setMute: jest.fn(),
    dark: false,
    setDark: jest.fn(),
  }

  const mergedContextValue = {
    ...defaultContextValue,
    ...contextValue,
  }

  // AppState context values
  const appStateValue = {
    loading: mergedContextValue.loading,
    setLoading: mergedContextValue.setLoading,
    error: mergedContextValue.error,
    setError: mergedContextValue.setError,
    visible: mergedContextValue.visible,
  }

  // Settings context values
  const settingsValue = {
    mute: mergedContextValue.mute,
    setMute: mergedContextValue.setMute,
    dark: mergedContextValue.dark,
    setDark: mergedContextValue.setDark,
  }

  function Wrapper({ children }) {
    return (
      <AppStateContext.Provider value={appStateValue}>
        <SettingsProvider value={settingsValue}>{children}</SettingsProvider>
      </AppStateContext.Provider>
    )
  }

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * Creates mock context value for testing
 */
export function createMockContext(overrides = {}) {
  return {
    // AppState context
    loading: false,
    setLoading: jest.fn(),
    error: null,
    setError: jest.fn(),
    visible: true,
    // Settings context
    mute: false,
    setMute: jest.fn(),
    dark: false,
    setDark: jest.fn(),
    ...overrides,
  }
}

// Re-export everything from RTL
export * from '@testing-library/react'
