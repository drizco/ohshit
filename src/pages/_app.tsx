import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import '../styles/main.scss'
import { AppStateProvider } from '../context/AppStateContext'
import { SettingsProvider } from '../context/SettingsContext'
import { auth } from '../lib/firebase'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { AppCacheProvider } from '@mui/material-nextjs/v14-pagesRouter'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { buildTheme } from '../lib/theme'

import Layout from '../components/Layout'
import ErrorModal from '../components/ErrorModal'
import Spinner from '../components/Spinner'

type AppState = {
  loading: boolean
  error: string | null
  visible: boolean
}

export default function MyApp(props: AppProps) {
  const { Component, pageProps } = props
  const isInitialMount = useRef(true)

  // Global app state (loading, error, visible)
  const [appState, setAppStateInternal] = useState<AppState>({
    loading: false,
    error: null,
    visible: true,
  })

  const setState = useCallback(
    (updates: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => {
      setAppStateInternal((prev) =>
        typeof updates === 'function'
          ? { ...prev, ...updates(prev) }
          : { ...prev, ...updates }
      )
    },
    []
  )

  // Settings state (dark mode, mute) - changes infrequently
  const [dark, setDark] = useState(true)
  const [mute, setMute] = useState(true)

  // App state
  const appStateValue = useMemo(
    () => ({
      ...appState,
      setLoading: (loading: boolean) => setState({ loading }),
      setError: (error: string | null) => setState({ error }),
    }),
    [appState, setState]
  )

  const settingsValue = useMemo(
    () => ({
      dark,
      mute,
      setDark,
      setMute,
    }),
    [dark, mute]
  )

  // Firebase anonymous auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Sign in anonymously if not already signed in
        signInAnonymously(auth).catch((error) => {
          console.error('Error signing in anonymously:', error)
          setState({
            error: 'Failed to authenticate. Please refresh the page.',
          })
        })
      }
    })

    return () => unsubscribe()
  }, [setState])

  // dark mode preference change listener
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme')

    if (window?.matchMedia) {
      if (storedTheme) {
        setDark(storedTheme === 'dark')
      } else {
        setDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
      }

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => {
        if (!localStorage.getItem('theme')) {
          setDark(e.matches)
        }
      }
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else if (storedTheme) {
      setDark(storedTheme === 'dark')
    }
    return
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync dark mode to Bootstrap's data-bs-theme and custom data-color-scheme
  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', dark ? 'dark' : 'light')
    document.documentElement.setAttribute('data-color-scheme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  // page visibility listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      setState({ visible: document.visibilityState === 'visible' })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [setState])

  const { loading } = appState

  return (
    <AppCacheProvider {...props}>
      <ThemeProvider theme={buildTheme(dark)}>
        <CssBaseline />
        <AppStateProvider value={appStateValue}>
          <SettingsProvider value={settingsValue}>
              <Head>
                <title>oh shit</title>
                <link rel="icon" type="image/png" href="/images/favicon.ico" />
                <meta property="og:site_name" content="oh shit" />
                <meta property="og:title" content="oh shit" />
                <meta
                  property="og:description"
                  content="oh shit is a fun card game you play in real time with friends!"
                />
                <meta
                  property="og:image"
                  content={`${process.env.NEXT_PUBLIC_BASE_URL}/images/poop.png`}
                />
                <meta property="og:image:alt" content="oh shit logo" />
                <meta property="og:image:height" content="1200" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:url" content={process.env.NEXT_PUBLIC_BASE_URL} />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:image:alt" content="oh shit logo" />
              </Head>
              <Layout>
                <Component {...pageProps} />
                <ErrorModal />
                <Spinner loading={loading} />
              </Layout>
          </SettingsProvider>
        </AppStateProvider>
      </ThemeProvider>
    </AppCacheProvider>
  )
}
