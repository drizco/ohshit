import React, { useContext, useState, useEffect } from 'react'

import styles from '../styles/components/card-row.module.scss'
import { getSource, getColor, isLegal } from '../utils/helpers'
import SettingsContext from '../context/SettingsContext'
import classNames from 'classnames'
import type { Card, Suit } from '../types'

interface CardRowProps {
  cards: Card[]
  playCard: (card: Card) => void
  queuedCard: Card | null
  leadSuit: Suit | null
}

const CardRow = ({ cards, playCard, queuedCard, leadSuit }: CardRowProps) => {
  const { dark } = useContext(SettingsContext)
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
  return (
    <>
      <ul className={styles.card_row}>
        {cards &&
          cards.map((card) => (
            <li
              className={classNames({
                'playing-card': true,
                [styles.shake]: illegalCard === card.cardId,
                [styles.selected]: queuedCard && queuedCard.cardId === card.cardId,
              })}
              data-card-id={card.cardId}
              key={card.cardId}
              onClick={(e) => {
                e.preventDefault()
                const legal = isLegal({ hand: cards, card, leadSuit })
                if (!legal) {
                  setIllegalCard(card.cardId || null)
                }
                playCard(card)
              }}
            >
              <div>
                <img src={getSource(card.suit, dark)} />
                <h2 style={{ color: getColor(card.suit, dark) }}>{card.value}</h2>
              </div>
            </li>
          ))}
      </ul>
      <style jsx>{`
        @media only screen and (max-width: 768px) {
          li {
            width: ${cardWidth}vw;
            height: ${cardWidth * 1.5}vw;
            max-width: 24vw;
            max-height: 36vw;
          }

          li > div > img {
            width: ${cardWidth * 0.3}vw;
            max-width: ${24 * 0.3}vw;
          }
          li > div > h2 {
            font-size: min(${cardWidth * 0.35}vw, 10vw);
          }

          ul {
            height: ${cardWidth * 1.5 * 0.6}vw;
            max-height: ${36 * 0.6}vw;
          }
        }
      `}</style>
    </>
  )
}

export default CardRow
