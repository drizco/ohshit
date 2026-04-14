import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useCardAnimation } from '../context/CardAnimationContext'
import type { FlyingCardEntry } from '../context/CardAnimationContext'
import { getSuitSymbol, getSuitColorClass } from '../utils/helpers'
import styles from '../styles/components/flying-card.module.scss'

const SELF_DURATION = 600
const SELF_ROTATIONS = 1080 // 3 full spins
const OPPONENT_DURATION = 500
const OPPONENT_ROTATIONS = 720 // 2 full spins
const SETTLE_DURATION = 250
const EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'

function FlyingCardClone({ entry }: { entry: FlyingCardEntry }) {
  const ref = useRef<HTMLDivElement>(null)
  const { onAnimationComplete } = useCardAnimation()
  const animatedRef = useRef(false)

  const { sourceRect, targetRect, type, card } = entry

  const naturalWidth = type === 'self' ? sourceRect.width : targetRect.height * (2 / 3)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || animatedRef.current) return
    animatedRef.current = true

    // self: sized to the hand card, scales down to the trick slot.
    // opponent: sized to the trick slot (no scaling), flies from the name label position.
    const naturalHeight = type === 'self' ? sourceRect.height : targetRect.height
    const startScale = 1
    const endScale = type === 'self' ? targetRect.height / naturalHeight : 1

    // Calculate centered positions
    const startLeft = sourceRect.left + sourceRect.width / 2 - naturalWidth / 2
    const startTop = sourceRect.top + sourceRect.height / 2 - naturalHeight / 2

    const endLeft = targetRect.left + targetRect.width / 2 - naturalWidth / 2
    const endTop = targetRect.top + targetRect.height / 2 - naturalHeight / 2

    const duration = type === 'self' ? SELF_DURATION : OPPONENT_DURATION
    const rotations = type === 'self' ? SELF_ROTATIONS : OPPONENT_ROTATIONS

    // Phase 1: Fly with spin
    const flyAnimation = el.animate(
      [
        {
          left: `${startLeft}px`,
          top: `${startTop}px`,
          transform: `rotate(0deg) scale(${startScale})`,
          opacity: 1,
        },
        {
          left: `${endLeft}px`,
          top: `${endTop}px`,
          transform: `rotate(${rotations}deg) scale(${endScale})`,
          opacity: 1,
        },
      ],
      {
        duration,
        easing: EASING,
        fill: 'forwards',
      }
    )

    flyAnimation.finished
      .then(() => {
        // Phase 2: Settle — shrink and fade border/background
        const settleAnimation = el.animate(
          [
            {
              borderColor: '',
              backgroundColor: '',
              borderWidth: '',
              opacity: '1',
            },
            {
              borderColor: 'transparent',
              backgroundColor: 'transparent',
              borderWidth: '0px',
              opacity: '0',
            },
          ],
          {
            duration: SETTLE_DURATION,
            easing: 'ease-out',
            fill: 'forwards',
          }
        )
        return settleAnimation.finished
      })
      .then(() => {
        onAnimationComplete(entry.id)
      })
      .catch(() => {
        // Animation was cancelled (e.g. component unmounted)
        onAnimationComplete(entry.id)
      })
  }, [entry, onAnimationComplete, sourceRect, targetRect, type])

  const suitColorClass = getSuitColorClass(card.suit)

  return (
    <div
      ref={ref}
      className={`playing-card ${styles.flying_card}`}
      aria-hidden="true"
      style={
        {
          position: 'fixed',
          left: sourceRect.left,
          top: sourceRect.top,
          width: type === 'self' ? sourceRect.width : targetRect.height * (2 / 3),
          height: type === 'self' ? sourceRect.height : targetRect.height,
          opacity: 0,
          zIndex: 999999,
          '--fly-symbol-size': `${naturalWidth * 0.5}px`,
          '--fly-value-size': `${naturalWidth * 0.44}px`,
          '--fly-symbol-size-md': `${naturalWidth * 0.44}px`,
          '--fly-value-size-md': `${naturalWidth * 0.38}px`,
          '--fly-content-padding':
            type === 'self' ? `${Math.round(naturalWidth * 0.09)}px` : '2px',
        } as React.CSSProperties
      }
    >
      <div className={styles.card_content}>
        <span className={styles[suitColorClass]}>{getSuitSymbol(card.suit)}</span>
        <span className={`${styles.card_value} ${styles[suitColorClass]}`}>
          {card.value}
        </span>
      </div>
    </div>
  )
}

export default function FlyingCard() {
  const { flyingCards } = useCardAnimation()

  if (typeof document === 'undefined' || flyingCards.length === 0) {
    return null
  }

  return createPortal(
    <>
      {flyingCards.map((entry) => (
        <FlyingCardClone key={entry.id} entry={entry} />
      ))}
    </>,
    document.body
  )
}
