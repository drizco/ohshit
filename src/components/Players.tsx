import { useLayoutEffect, useRef } from 'react'
import classNames from 'classnames'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Grid from '@mui/material/Grid'
import styles from '../styles/components/players.module.scss'
import { getSuitSymbol, getSuitColorClass } from '../utils/helpers'
import { useCardAnimation } from '../context/CardAnimationContext'
import type { Player, Trick, GameStatus } from '../types'

interface PlayersProps {
  players: Record<string, Player>
  playerOrder: string[]
  currentPlayer: string
  bids: Record<string, number> | null
  roundScore: Record<string, number>
  trick: Trick | null
  bid: number
  handleToggle: (inc: boolean, value?: string) => void
  submitBid: () => Promise<void>
  afterBid: () => void
  dealer: string
  thisPlayer: string
  score: Record<string, number> | null
  timeLimit: number | null
  timeRemaining: number | null
  winnerModalShowing: boolean
  status: GameStatus | null
}

const Players = ({
  players,
  playerOrder,
  currentPlayer,
  bids,
  roundScore,
  trick,
  bid,
  handleToggle,
  submitBid,
  afterBid,
  dealer,
  thisPlayer,
  score,
  timeLimit,
  timeRemaining,
  winnerModalShowing,
  status,
}: PlayersProps) => {
  const { triggerOpponentCardFly, isCardPendingReveal } = useCardAnimation()
  const prevTrickCardsRef = useRef<Record<string, boolean>>({})

  // Detect new opponent cards and trigger fly animation
  useLayoutEffect(() => {
    if (!trick?.cards) {
      prevTrickCardsRef.current = {}
      return
    }

    const currentKeys = Object.keys(trick.cards)
    const prevKeys = prevTrickCardsRef.current

    for (const playerId of currentKeys) {
      if (!prevKeys[playerId] && playerId !== thisPlayer) {
        // New card from an opponent — trigger animation
        triggerOpponentCardFly(trick.cards[playerId], playerId)
      }
    }

    const newPrev: Record<string, boolean> = {}
    for (const key of currentKeys) {
      newPrev[key] = true
    }
    prevTrickCardsRef.current = newPrev
  }, [trick?.cards, thisPlayer, triggerOpponentCardFly])

  const newPlayers =
    playerOrder.length > 0
      ? playerOrder.map((id) => players[id]).filter(Boolean)
      : Object.values(players)

  return (
    <ul className={styles.players} aria-label="Players and scores">
      {newPlayers &&
        newPlayers.map(({ playerId, present, name }) => {
          const isCurrent = currentPlayer === playerId
          const isDealer = dealer === playerId
          let playerScore = score && score[playerId] ? score[playerId] : '0'
          if (!status || status === 'pending') {
            playerScore = ''
          }
          const timerShowMax = timeLimit && timeLimit > 10 ? 10 : 5

          return (
            <li key={playerId}>
              <Grid
                container
                className={classNames({
                  [styles.current_player_arrow]: isCurrent,
                  [styles.player_row]: true,
                  'player-row': true,
                })}
              >
                <Grid size={4} sx={{ display: 'flex', alignItems: 'center' }}>
                  <div className="player-score" data-player-score={playerScore}>
                    {timeLimit &&
                      thisPlayer !== currentPlayer &&
                      currentPlayer === playerId &&
                      timeRemaining !== null &&
                      timeRemaining <= timerShowMax && (
                        <div
                          className={styles.countdown}
                          aria-live="polite"
                          aria-label={`${timeRemaining} seconds remaining`}
                        >
                          <span
                            className={classNames(
                              styles.countdown_number,
                              styles.suit_red
                            )}
                          >
                            {timeRemaining}
                          </span>
                        </div>
                      )}
                    <h2
                      className={classNames({
                        [styles.current_player]: isCurrent,
                        [styles.not_present]: !present,
                        [styles.dealer]: isDealer,
                        'player-name': true,
                      })}
                      data-player-name={playerId}
                    >
                      {name}
                    </h2>
                  </div>
                </Grid>
                {bids && bids[playerId] != null && (
                  <Grid
                    size={{ xs: 3, sm: 4 }}
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <Box
                      aria-live="polite"
                      sx={{ display: 'flex', flexWrap: 'wrap', flexDirection: 'row' }}
                    >
                      <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                        <p className={styles.bid_won_text}>{`Bid: ${bids[playerId]}`}</p>
                      </Box>
                      <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                        <p
                          className={styles.bid_won_text}
                        >{`Won: ${roundScore[playerId] || '0'}`}</p>
                      </Box>
                    </Box>
                  </Grid>
                )}
                {bids && bids[playerId] != null && (
                  <Grid size={{ xs: 5, sm: 4 }} data-player-trick-slot={playerId}>
                    {trick && trick.cards && trick.cards[playerId] && (
                      <div
                        className={classNames(styles.card, {
                          [styles.pending_reveal]: isCardPendingReveal(playerId),
                        })}
                      >
                        <span
                          className={
                            styles[getSuitColorClass(trick.cards[playerId].suit)]
                          }
                        >
                          {getSuitSymbol(trick.cards[playerId].suit)}
                        </span>
                        <span
                          className={classNames(
                            styles.card_value,
                            styles[getSuitColorClass(trick.cards[playerId].suit)]
                          )}
                        >
                          {trick.cards[playerId].value}
                        </span>
                      </div>
                    )}
                  </Grid>
                )}
              </Grid>
              <Dialog
                open={
                  status === 'bid' &&
                  !winnerModalShowing &&
                  thisPlayer === playerId &&
                  currentPlayer === playerId
                }
                slotProps={{ transition: { onExited: afterBid } }}
              >
                <DialogContent>
                  <Box sx={{ textAlign: 'center' }}>
                    <h2>Bid</h2>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <div>
                      {newPlayers &&
                        newPlayers
                          .filter((p) => !!bids && bids[p.playerId] != null)
                          .map(({ playerId: pid, name: pname }) => (
                            <p className={styles.bid_list_item} key={pid}>
                              {`${pname}: ${bids?.[pid]}`}
                            </p>
                          ))}
                    </div>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <div>
                      <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
                        <Button
                          variant="contained"
                          color="error"
                          className={styles.toggle_button}
                          aria-label="Decrease bid"
                          onClick={(e) => handleToggle(false, e.currentTarget.value)}
                        >
                          -
                        </Button>
                        <input
                          type="text"
                          value={bid}
                          name="bid"
                          id="bid"
                          aria-label="Current bid"
                          className={classNames(styles.toggle_results, 'main-text')}
                          readOnly
                        />
                        <Button
                          variant="contained"
                          color="success"
                          className={styles.toggle_button}
                          aria-label="Increase bid"
                          onClick={(e) => handleToggle(true, e.currentTarget.value)}
                        >
                          +
                        </Button>
                      </Box>
                    </div>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      className={styles.bid_button}
                      onClick={submitBid}
                    >
                      BID
                    </Button>
                  </Box>
                </DialogContent>
              </Dialog>
            </li>
          )
        })}
    </ul>
  )
}

export default Players
