import React, { useState, useEffect } from 'react'
import Box from '@mui/material/Box'

import styles from '../styles/components/card-row.module.scss'
import { getSuitSymbol, getSuitColorClass, isLegal } from '../utils/helpers'
import classNames from 'classnames'
import { useCardAnimation } from '../context/CardAnimationContext'
import type { Card, Suit } from '../types'

interface CardRowProps {
  cards: Card[]
  playCard: (card: Card) => void
  queuedCard: Card | null
  leadSuit: Suit | null
  onCardPlayed?: (card: Card, sourceEl: HTMLElement) => void
}

const CardRow = ({
  cards,
  playCard,
  queuedCard,
  leadSuit,
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

  const cardWidth = 100 / (cards.length || 1)

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

  return (
    <>
      <Box
        component="ul"
        className={styles.card_row}
        aria-label="Your hand — select a card to play"
        sx={{
          '@media only screen and (max-width: 768px)': {
            height: `${cardWidth * 1.5 * 0.6}vw`,
            maxHeight: `${36 * 0.6}vw`,
          },
        }}
      >
        {cards &&
          cards.map((card) => {
            const legal = isLegal({ hand: cards, card, leadSuit })
            const isSelected = !!(queuedCard && queuedCard.cardId === card.cardId)
            const flying = !!(card.cardId && isCardFlying(card.cardId))
            return (
              <Box
                component="li"
                className={classNames({
                  'playing-card': true,
                  [styles.shake]: illegalCard === card.cardId,
                  [styles.selected]: isSelected,
                  [styles.flying]: flying,
                })}
                data-card-id={card.cardId}
                key={card.cardId}
                sx={{
                  '@media only screen and (max-width: 768px)': {
                    width: `${cardWidth}vw`,
                    height: `${cardWidth * 1.5}vw`,
                    maxWidth: '24vw',
                    maxHeight: '36vw',
                    '& > div > span:first-of-type': {
                      fontSize: `min(${cardWidth * 0.3}vw, ${24 * 0.3}vw)`,
                    },
                    '& > div > span:last-of-type': {
                      fontSize: `min(${cardWidth * 0.35}vw, 10vw)`,
                    },
                  },
                }}
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
              </Box>
            )
          })}
      </Box>
    </>
  )
}

export default CardRow
