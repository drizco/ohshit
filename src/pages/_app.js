import { useState, useEffect, useMemo, useCallback } from "react"
import Head from "next/head"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/main.scss"
import { CombinedProvider } from "../context/CombinedContext"

import Layout from "../components/Layout"
import {
  DARK_BACKGROUND,
  LIGHT_BACKGROUND,
  DARK_TEXT,
  LIGHT_TEXT,
  PINK,
  RED,
  BLACK,
  WHITE,
} from "../utils/constants"
import ErrorModal from "../components/ErrorModal"
import Spinner from "../components/Spinner"

export default function MyApp({ Component, pageProps }) {
  const [state, setStateInternal] = useState({
    mute: true,
    dark: true,
    loading: false,
    mounted: false,
    error: false,
    visible: true,
    timer: null,
  })

  const setState = useCallback((updates) => {
    setStateInternal((prev) =>
      typeof updates === "function" ? updates(prev) : { ...prev, ...updates },
    )
  }, [])

  const contextValue = useMemo(
    () => ({
      ...state,
      setState,
    }),
    [state, setState],
  )

  // dark mode preference detection and listener
  useEffect(() => {
    const prefersDark = () =>
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches

    setStateInternal((prev) => ({ ...prev, dark: prefersDark() }))

    if (window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = () => {
        setStateInternal((prev) => ({ ...prev, dark: prefersDark() }))
      }

      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
  }, [])

  // page visibility listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      setStateInternal((prev) => ({
        ...prev,
        visible: document.visibilityState === "visible",
      }))
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  const { dark, loading } = state

  return (
    <CombinedProvider value={contextValue}>
      <Head>
        <title>oopsie poopsie</title>
        <link rel="icon" type="image/png" href="/images/favicon.ico" />
        <meta property="og:site_name" content="oopsie poopsie" />
        <meta property="og:title" content="oopsie poopsie" />
        <meta
          property="og:description"
          content="oopsie poopsie is a fun card game you play in real time with friends!"
        />
        <meta property="og:image" content="https://oopsie-poopsie.app/images/poop.png" />
        <meta property="og:image:alt" content="oopsie poopsie logo" />
        <meta property="og:image:height" content="1200" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:url" content="https://oopsie-poopsie.app" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image:alt" content="oopsie poopsie logo" />
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
          background-color: ${dark ? BLACK : "#FFF"} !important;
          border-color: ${dark ? DARK_BACKGROUND : BLACK} !important;
        }

        .modal-content {
          background-color: ${dark ? DARK_BACKGROUND : LIGHT_BACKGROUND} !important;
          color: ${dark ? DARK_TEXT : LIGHT_TEXT} !important;
        }

        input {
          border: ${dark ? "none" : `1px solid #f7f7f7`} !important;
        }

        header {
          border-bottom: 1px solid ${dark ? BLACK : "#f7f7f7"};
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
    </CombinedProvider>
  )
}
