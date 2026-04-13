import React, { useState, useEffect } from 'react'

import styles from '../styles/components/card-row.module.scss'
import { getSuitSymbol, getSuitColorClass, isLegal } from '../utils/helpers'
import classNames from 'classnames'
import { useCardAnimation } from '../context/CardAnimationContext'
import type { Card, Suit } from '../types'

const MOBILE_MAX_ROW = 7

interface CardRowProps {
  cards: Card[]
  playCard: (card: Card) => void
  queuedCard: Card | null
  leadSuit: Suit | null
  isMobile?: boolean
  onCardPlayed?: (card: Card, sourceEl: HTMLElement) => void
}

const CardRow = ({
  cards,
  playCard,
  queuedCard,
  leadSuit,
  isMobile,
  onCardPlayed,
}: CardRowProps) => {
  const { isCardFlying } = useCardAnimation()
  const [illegalCard, setIllegalCard] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIllegalCard(null)
    }, 320)
    return () => {
      clearTimeout(timer)
    }
  }, [illegalCard])

  const handleCardAction = (card: Card) => {
    const legal = isLegal({ hand: cards, card, leadSuit })
    if (!legal) {
      setIllegalCard(card.cardId || null)
      return
    }
    if (onCardPlayed && card.cardId) {
      const el = document.querySelector(
        `[data-card-id="${card.cardId}"]`
      ) as HTMLElement | null
      if (el) {
        onCardPlayed(card, el)
      }
    }
    playCard(card)
  }

  const isTwoRow = !!isMobile && cards.length > MOBILE_MAX_ROW
  const topRow = isTwoRow ? cards.slice(0, cards.length - MOBILE_MAX_ROW) : []
  const bottomRow = isTwoRow ? cards.slice(cards.length - MOBILE_MAX_ROW) : cards
  const mobileCardVw = isTwoRow
    ? 100 / MOBILE_MAX_ROW
    : Math.min(100 / (cards.length || 1), 22)

  const renderCard = (card: Card) => {
    const legal = isLegal({ hand: cards, card, leadSuit })
    const isSelected = !!(queuedCard && queuedCard.cardId === card.cardId)
    const flying = !!(card.cardId && isCardFlying(card.cardId))
    return (
      <li
        className={classNames({
          'playing-card': true,
          [styles.shake]: illegalCard === card.cardId,
          [styles.selected]: isSelected,
          [styles.flying]: flying,
        })}
        data-card-id={card.cardId}
        key={card.cardId}
      >
        <div aria-hidden="true">
          <span className={styles[getSuitColorClass(card.suit)]}>
            {getSuitSymbol(card.suit)}
          </span>
          <span
            className={classNames(
              styles.card_value,
              styles[getSuitColorClass(card.suit)]
            )}
          >
            {card.value}
          </span>
        </div>
        <button
          type="button"
          className={styles.card_button}
          aria-label={`${card.value} of ${card.suit}`}
          aria-pressed={isSelected}
          aria-disabled={!legal}
          onClick={(e) => {
            e.preventDefault()
            handleCardAction(card)
          }}
        />
      </li>
    )
  }

  return (
    <div
      className={styles.card_row_wrapper}
      aria-label="Your hand — select a card to play"
      style={{ '--mobile-card-vw': `${mobileCardVw}vw` } as React.CSSProperties}
    >
      {topRow.length > 0 && (
        <ul className={`${styles.card_row} ${styles.card_row_top}`} aria-hidden="true">
          {topRow.map(renderCard)}
        </ul>
      )}
      <ul className={`${styles.card_row} ${styles.card_row_bottom}`}>
        {bottomRow.map(renderCard)}
      </ul>
    </div>
  )
}

export default CardRow
