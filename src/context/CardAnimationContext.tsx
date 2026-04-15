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
  triggerCardFly: (card: Card, targetPlayerId: string) => void
  triggerOpponentCardFly: (card: Card, playerId: string) => void
  triggerCardShake: (cardId?: string) => void
  onAnimationComplete: (id: string) => void
  isCardFlying: (cardId: string) => boolean
  isCardPendingReveal: (playerId: string) => boolean
  reducedMotion: boolean
}

const CardAnimationContext = createContext<CardAnimationContextValue>({
  flyingCards: [],
  triggerCardFly: () => {},
  triggerOpponentCardFly: () => {},
  triggerCardShake: () => {},
  onAnimationComplete: () => {},
  isCardFlying: () => false,
  isCardPendingReveal: () => false,
  reducedMotion: false,
})

const SHAKE_ANIMATION_ID = 'card-shake'
const SHAKE_KEYFRAMES: Keyframe[] = [
  { transform: 'translate3d(0, 0, 0)', offset: 0 },
  { transform: 'translate3d(-1px, 0, 0)', offset: 0.1 },
  { transform: 'translate3d(2px, 0, 0)', offset: 0.2 },
  { transform: 'translate3d(-4px, 0, 0)', offset: 0.3 },
  { transform: 'translate3d(4px, 0, 0)', offset: 0.4 },
  { transform: 'translate3d(-4px, 0, 0)', offset: 0.5 },
  { transform: 'translate3d(4px, 0, 0)', offset: 0.6 },
  { transform: 'translate3d(-4px, 0, 0)', offset: 0.7 },
  { transform: 'translate3d(2px, 0, 0)', offset: 0.8 },
  { transform: 'translate3d(-1px, 0, 0)', offset: 0.9 },
  { transform: 'translate3d(0, 0, 0)', offset: 1 },
]
const SHAKE_OPTIONS: KeyframeAnimationOptions = {
  duration: 320,
  easing: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)',
  id: SHAKE_ANIMATION_ID,
}

let flyIdCounter = 0

export function CardAnimationProvider({ children }: { children: React.ReactNode }) {
  const [flyingCards, setFlyingCards] = useState<FlyingCardEntry[]>([])
  const reducedMotionRef = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )

  const triggerCardFly = useCallback((card: Card, targetPlayerId: string) => {
    if (reducedMotionRef.current) return

    const sourceEl = document.querySelector(`[data-card-id="${card.cardId}"]`)
    const targetEl = document.querySelector(
      `[data-player-trick-slot="${targetPlayerId}"]`
    )
    if (!sourceEl || !targetEl) return

    const sourceRect = sourceEl.getBoundingClientRect()
    const targetRect = targetEl.getBoundingClientRect()

    const id = `fly-${++flyIdCounter}`
    setFlyingCards((prev) => [
      ...prev,
      { id, card, sourceRect, targetRect, targetPlayerId, type: 'self' },
    ])
  }, [])

  const triggerOpponentCardFly = useCallback((card: Card, playerId: string) => {
    if (reducedMotionRef.current) return

    const nameEl = document.querySelector(`[data-player-name="${playerId}"]`)
    const targetEl = document.querySelector(`[data-player-trick-slot="${playerId}"]`)
    if (!nameEl || !targetEl) return

    const sourceRect = nameEl.getBoundingClientRect()
    const targetRect = targetEl.getBoundingClientRect()

    const id = `fly-${++flyIdCounter}`
    setFlyingCards((prev) => [
      ...prev,
      { id, card, sourceRect, targetRect, targetPlayerId: playerId, type: 'opponent' },
    ])
  }, [])

  const triggerCardShake = useCallback((cardId?: string) => {
    if (reducedMotionRef.current) return
    if (!cardId) return
    const el = document.querySelector<HTMLElement>(`[data-card-id="${cardId}"]`)
    if (!el) return
    // Cancel any in-flight shake on this element so rapid re-clicks
    // restart the animation cleanly instead of overlapping.
    el.getAnimations().forEach((a) => {
      if (a.id === SHAKE_ANIMATION_ID) a.cancel()
    })
    el.animate(SHAKE_KEYFRAMES, SHAKE_OPTIONS)
  }, [])

  const onAnimationComplete = useCallback((id: string) => {
    setFlyingCards((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const isCardFlying = useCallback(
    (cardId: string) =>
      flyingCards.some((f) => f.type === 'self' && f.card.cardId === cardId),
    [flyingCards]
  )

  const isCardPendingReveal = useCallback(
    (playerId: string) => flyingCards.some((f) => f.targetPlayerId === playerId),
    [flyingCards]
  )

  return (
    <CardAnimationContext.Provider
      value={{
        flyingCards,
        triggerCardFly,
        triggerOpponentCardFly,
        triggerCardShake,
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
