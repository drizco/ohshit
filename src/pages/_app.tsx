import { useState, useEffect, useMemo, useCallback } from 'react'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import 'bootstrap/dist/css/bootstrap.min.css'
import '../styles/main.scss'
import { AppStateProvider } from '../context/AppStateContext'
import { SettingsProvider } from '../context/SettingsContext'
import { TimerProvider } from '../context/TimerContext'
import { auth } from '../lib/firebase'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'

import Layout from '../components/Layout'
import {
  DARK_BACKGROUND,
  LIGHT_BACKGROUND,
  DARK_TEXT,
  LIGHT_TEXT,
  PINK,
  RED,
  BLACK,
  WHITE,
} from '../utils/constants'
import ErrorModal from '../components/ErrorModal'
import Spinner from '../components/Spinner'

type AppState = {
  loading: boolean
  error: string | null
  visible: boolean
}

export default function MyApp({ Component, pageProps }: AppProps) {
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
  const [dark, setDark] = useState(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  const [mute, setMute] = useState(true)

  // Timer state - changes frequently, isolated
  const [timer, setTimer] = useState(0)

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

  const timerValue = useMemo(
    () => ({
      timer,
      setTimer,
    }),
    [timer]
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
    if (window?.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      const handleChange = () => {
        setDark(mediaQuery.matches)
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    return undefined
  }, [])

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
    <AppStateProvider value={appStateValue}>
      <SettingsProvider value={settingsValue}>
        <TimerProvider value={timerValue}>
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
          <style global jsx>{`
            body {
              background-color: ${dark ? DARK_BACKGROUND : LIGHT_BACKGROUND} !important;
            }
            h1,
            h2,
            h3,
            h4,
            h5,
            h6,
            p,
            label,
            .main-text {
              color: ${dark ? DARK_TEXT : LIGHT_TEXT};
            }

            .playing-card {
              background-color: ${dark ? BLACK : '#FFF'} !important;
              border-color: ${dark ? DARK_BACKGROUND : BLACK} !important;
            }

            .modal-content {
              background-color: ${dark ? DARK_BACKGROUND : LIGHT_BACKGROUND} !important;
              color: ${dark ? DARK_TEXT : LIGHT_TEXT} !important;
            }

            input {
              border: ${dark ? 'none' : `1px solid #f7f7f7`} !important;
            }

            header {
              border-bottom: 1px solid ${dark ? BLACK : '#f7f7f7'};
            }

            a,
            .red-text,
            .player-row::before,
            .player-score::before,
            .player-name::after {
              color: ${dark ? PINK : RED} !important;
            }

            .close {
              color: ${dark ? DARK_TEXT : LIGHT_TEXT};
            }
            .close:hover {
              color: ${dark ? WHITE : BLACK};
            }
          `}</style>
        </TimerProvider>
      </SettingsProvider>
    </AppStateProvider>
  )
}
