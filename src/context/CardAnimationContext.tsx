import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { Card } from '../types'

export interface FlyingCardEntry {
  id: string
  card: Card
  sourceRect: DOMRect
  targetRect: DOMRect
  targetPlayerId: string
  type: 'self' | 'opponent'
}

interface CardAnimationContextValue {
  flyingCards: FlyingCardEntry[]
  triggerCardFly: (card: Card, sourceEl: HTMLElement, targetPlayerId: string) => void
  triggerOpponentCardFly: (card: Card, playerId: string) => void
  onAnimationComplete: (id: string) => void
  isCardFlying: (cardId: string) => boolean
  isCardPendingReveal: (playerId: string) => boolean
  reducedMotion: boolean
}

const CardAnimationContext = createContext<CardAnimationContextValue>({
  flyingCards: [],
  triggerCardFly: () => {},
  triggerOpponentCardFly: () => {},
  onAnimationComplete: () => {},
  isCardFlying: () => false,
  isCardPendingReveal: () => false,
  reducedMotion: false,
})

let flyIdCounter = 0

export function CardAnimationProvider({ children }: { children: React.ReactNode }) {
  const [flyingCards, setFlyingCards] = useState<FlyingCardEntry[]>([])
  const reducedMotionRef = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )

  const triggerCardFly = useCallback(
    (card: Card, sourceEl: HTMLElement, targetPlayerId: string) => {
      if (reducedMotionRef.current) return

      const sourceRect = sourceEl.getBoundingClientRect()
      const targetEl = document.querySelector(
        `[data-player-trick-slot="${targetPlayerId}"]`
      )
      if (!targetEl) return
      const targetRect = targetEl.getBoundingClientRect()

      const id = `fly-${++flyIdCounter}`
      setFlyingCards((prev) => [
        ...prev,
        { id, card, sourceRect, targetRect, targetPlayerId, type: 'self' },
      ])
    },
    []
  )

  const triggerOpponentCardFly = useCallback(
    (card: Card, playerId: string) => {
      if (reducedMotionRef.current) return

      const nameEl = document.querySelector(
        `[data-player-name="${playerId}"]`
      )
      const targetEl = document.querySelector(
        `[data-player-trick-slot="${playerId}"]`
      )
      if (!nameEl || !targetEl) return

      const sourceRect = nameEl.getBoundingClientRect()
      const targetRect = targetEl.getBoundingClientRect()

      const id = `fly-${++flyIdCounter}`
      setFlyingCards((prev) => [
        ...prev,
        { id, card, sourceRect, targetRect, targetPlayerId: playerId, type: 'opponent' },
      ])
    },
    []
  )

  const onAnimationComplete = useCallback((id: string) => {
    setFlyingCards((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const isCardFlying = useCallback(
    (cardId: string) => flyingCards.some((f) => f.type === 'self' && f.card.cardId === cardId),
    [flyingCards]
  )

  const isCardPendingReveal = useCallback(
    (playerId: string) =>
      flyingCards.some((f) => f.targetPlayerId === playerId),
    [flyingCards]
  )

  return (
    <CardAnimationContext.Provider
      value={{
        flyingCards,
        triggerCardFly,
        triggerOpponentCardFly,
        onAnimationComplete,
        isCardFlying,
        isCardPendingReveal,
        reducedMotion: reducedMotionRef.current,
      }}
    >
      {children}
    </CardAnimationContext.Provider>
  )
}

export function useCardAnimation() {
  return useContext(CardAnimationContext)
}

export default CardAnimationContext
