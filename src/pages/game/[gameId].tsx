import { useEffect, useRef, useContext, useMemo } from 'react'
import { useTimer } from '../../hooks/useTimer'
import { useRouter } from 'next/router'
import type { GetServerSidePropsContext } from 'next'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AppStateContext from '../../context/AppStateContext'
import styles from '../../styles/pages/game.module.scss'
import CardRow from '../../components/CardRow'
import {
  getSuitSymbol,
  getSuitColorClass,
  getAvailableTricks,
  getWinner,
} from '../../utils/helpers'
import Players from '../../components/Players'
import NotificationController from '../../components/NotificationController'
import CustomTrump from '../../components/CustomTrump'
import CountdownOverlay from '../../components/CountdownOverlay'
import JoinGameForm from '../../components/JoinGameForm'
import YourTurnIndicator from '../../components/YourTurnIndicator'
import FlyingCard from '../../components/FlyingCard'
import {
  CardAnimationProvider,
  useCardAnimation,
} from '../../context/CardAnimationContext'

// Custom hooks
import useGameState from '../../hooks/useGameState'
import useGameComputed from '../../hooks/useGameComputed'
import useGameListeners from '../../hooks/useGameListeners'
import useGameActions from '../../hooks/useGameActions'
import useTrickTransition from '../../hooks/useTrickTransition'

interface GameProps {
  gameId: string
  isMobile: boolean
}

function GameWithAnimation(props: GameProps) {
  return (
    <CardAnimationProvider>
      <Game {...props} />
    </CardAnimationProvider>
  )
}

function Game({ gameId, isMobile }: GameProps) {
  const router = useRouter()
  const { visible, setError, setLoading } = useContext(AppStateContext)
  const { triggerCardFly, triggerCardShake, reducedMotion } = useCardAnimation()

  // Hook #1: State Management
  const { state, updateState, dispatchRound, roundState, initializeGame } = useGameState({
    gameId,
  })

  const { game, players, playerId, playerName, hand, bid, showYourTurn, queuedCard } =
    state
  const { tricks, bids, trump } = roundState

  // Hook #2: Computed Values
  const computed = useGameComputed({
    tricks: roundState.tricks,
    players: state.players,
    playerId: state.playerId,
  })
  const { trickIndex, roundScore, isHost, trick, leadSuit } = computed

  // Refs for actions
  const autoPlayTimeoutRef = useRef(null)

  // Refs passed into useTrickTransition so onTrickWon always snapshots the
  // latest bids/roundScore at the moment the Firebase event fires.
  const bidsRef = useRef(bids)
  bidsRef.current = bids
  const roundScoreRef = useRef(roundScore)
  roundScoreRef.current = roundScore

  // Trick transition: sequences card animations, winner modal, and snapshot display.
  const { transitionState, onTrickWon, closeModal, onModalExited } = useTrickTransition({
    reducedMotion,
    bidsRef,
    roundScoreRef,
  })
  const { displayedTrick, snapshot, winner, modalOpen } = transitionState

  // Resolved display values: use transition snapshots while active, live values otherwise.
  const resolvedTrick = displayedTrick ?? trick
  const resolvedBids = snapshot?.bids ?? bids
  const resolvedRoundScore = snapshot?.roundScore ?? roundScore

  // Hook #3: Firebase Listeners
  const { removeListeners } = useGameListeners({
    gameId,
    playerId,
    roundId: game?.state?.roundId || null,
    updateState,
    dispatchRound,
    setError,
    onTrickWon,
  })

  // Hook #4: Game Actions
  const actions = useGameActions({
    gameId,
    playerId: playerId || '',
    playerName,
    game,
    hand,
    bid,
    bids,
    tricks,
    trickIndex,
    queuedCard,
    visible,
    setError,
    setLoading,
    updateState,
    autoPlayTimeoutRef,
    onIllegalCard: triggerCardShake,
    onBeforePlay: triggerCardFly,
  })

  const {
    playCard,
    submitBid,
    randomPlay,
    playAgain,
    addPlayer,
    startGameHandler,
    handleChange,
    handleToggle,
    yourTurn,
  } = actions

  // Effect: Initialize game on mount and when gameId changes
  useEffect(() => {
    initializeGame()

    return () => {
      removeListeners()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

  // Clear queued card when entering bid phase (new round)
  useEffect(() => {
    if (game?.state?.status === 'bid' && queuedCard) {
      updateState({ queuedCard: null })
    }
  }, [game?.state?.status, queuedCard, updateState])

  // Handle "your turn" logic
  useEffect(() => {
    const currentPlayerId = game?.state?.playerOrder?.[game.state.currentPlayerIndex]
    const status = game?.state?.status
    if (game && currentPlayerId === playerId && (status === 'play' || status === 'bid')) {
      yourTurn()
    }
    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current)
        autoPlayTimeoutRef.current = null
      }
    }
  }, [game, playerId, yourTurn])

  const status = game?.state?.status ?? null
  const currentPlayerIndex = game?.state?.currentPlayerIndex ?? null
  const playerOrder = (game?.state?.playerOrder || []) ?? null
  const currentPlayer = currentPlayerIndex !== null ? playerOrder[currentPlayerIndex] : ''
  const dealerIndex = game?.state?.dealerIndex ?? 0
  const dealer = playerOrder[dealerIndex] ?? null
  const roundNum = game?.state?.roundNum ?? null
  const numRounds = game?.state?.numRounds ?? null
  const numCards = (game?.state?.numCards || game?.settings?.numCards) ?? 0
  const name = game?.metadata?.name ?? null
  const nextGame = game?.state?.nextGame ?? null
  const timeLimit = game?.settings?.timeLimit ?? null
  const turnStartedAt = game?.state?.turnStartedAt ?? null

  const { timeRemaining } = useTimer({
    timeLimit: timeLimit ?? null,
    turnStartedAt,
    playerId: playerId || '',
    currentPlayer,
    randomPlay,
  })

  const timerShowMax = timeLimit && timeLimit > 10 ? 10 : 5

  const isYourTurn = useMemo(
    () => playerId === currentPlayer && (status === 'play' || status === 'bid'),
    [playerId, currentPlayer, status]
  )

  // Score is now under players
  const score: Record<string, number> = {}
  if (players) {
    Object.values(players).forEach((player) => {
      if (player.score !== undefined) {
        score[player.playerId] = player.score
      }
    })
  }

  // Render logic
  if (!game) {
    return (
      <div className={styles.game_page}>
        <Container>
          <h2>Loading game...</h2>
        </Container>
      </div>
    )
  }

  return (
    <>
      <div className={styles.game_page}>
        <CountdownOverlay
          timeRemaining={timeRemaining ?? 0}
          isVisible={
            !!timeLimit &&
            playerId === currentPlayer &&
            timeRemaining !== null &&
            timeRemaining <= timerShowMax
          }
        />
        <Grid container className={styles.info_row}>
          <Grid size={4}>
            {name && (
              <Typography
                variant="h6"
                component="h2"
                sx={{
                  textDecoration: 'underline',
                  fontWeight: 'bold',
                  fontSize: { xs: '4vw', sm: '1.5vw' },
                }}
              >
                {name}
              </Typography>
            )}
          </Grid>
          <Grid size={4}>
            {isHost && status && status === 'pending' && (
              <Box>
                <Button variant="contained" color="success" onClick={startGameHandler}>
                  START GAME
                </Button>
              </Box>
            )}
            {status && (status === 'bid' || status === 'play' || status === 'over') && (
              <div className={styles.game_stats}>
                <div className={styles.stat}>
                  <span className={styles.stat_label}>ROUND</span>
                  <span
                    className={styles.stat_value}
                  >{`${roundNum} of ${numRounds}`}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.stat_label}>TRICKS</span>
                  <span className={styles.stat_value}>{numCards}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.stat_label}>BID DIFF</span>
                  <span className={styles.stat_value}>
                    {getAvailableTricks({ numCards, bids })}
                  </span>
                </div>
              </div>
            )}
          </Grid>
          <Grid size={2} className={styles.lead_trump_container}>
            {leadSuit && (
              <>
                <p className={styles.game_info}>LEAD</p>
                <span className={styles[getSuitColorClass(leadSuit)]}>
                  {getSuitSymbol(leadSuit)}
                </span>
              </>
            )}
          </Grid>
          <Grid size={2} className={styles.lead_trump_container}>
            {trump && (
              <>
                <CustomTrump className={styles.game_info} />
                <span className={styles[getSuitColorClass(trump)]}>
                  {getSuitSymbol(trump)}
                </span>
              </>
            )}
          </Grid>
        </Grid>
        {!playerId && (
          <JoinGameForm
            playerName={playerName}
            onPlayerNameChange={handleChange}
            onJoin={addPlayer}
          />
        )}
        <Players
          players={players}
          playerOrder={playerOrder}
          currentPlayer={currentPlayer}
          bids={resolvedBids}
          roundScore={resolvedRoundScore}
          trick={resolvedTrick}
          bid={bid}
          dealer={dealer}
          handleToggle={handleToggle}
          submitBid={() => submitBid()}
          afterBid={() => updateState({ bid: 0 })}
          thisPlayer={playerId || ''}
          score={score}
          timeLimit={timeLimit}
          timeRemaining={timeRemaining}
          winnerModalShowing={!!displayedTrick}
          status={status}
          numCards={numCards}
          dirty={game?.settings?.dirty ?? false}
        />
      </div>
      <YourTurnIndicator
        isYourTurn={isYourTurn}
        turnKey={`${status}-${currentPlayerIndex}-${trickIndex}`}
      />
      <CardRow
        cards={hand}
        playCard={playCard}
        queuedCard={queuedCard}
        leadSuit={leadSuit || null}
        isMobile={isMobile}
      />
      <FlyingCard />
      {/* Trick winner flash modal */}
      <Dialog
        open={modalOpen}
        onClose={closeModal}
        slotProps={{
          transition: {
            onEntered: () => {
              setTimeout(closeModal, 1000)
            },
            onExited: onModalExited,
          },
        }}
      >
        <DialogContent sx={{ textAlign: 'center' }}>
          {winner && (
            <Typography
              variant="h5"
              component="h2"
              sx={{ mb: 2, fontWeight: 'bold' }}
            >{`${getWinner({ winner, players })} won!`}</Typography>
          )}
          <Button variant="outlined" onClick={closeModal}>
            CLOSE
          </Button>
        </DialogContent>
      </Dialog>
      {/* Game over modal */}
      <Dialog
        open={status === 'over' && !displayedTrick}
        onClose={() => {}}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
          <Typography variant="h4" component="h2" fontWeight="bold">
            game over
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 2, mb: 3 }}>
            {Object.values(players)
              .sort((a, b) => {
                const aScore = score?.[a.playerId] ?? 0
                const bScore = score?.[b.playerId] ?? 0
                return bScore - aScore
              })
              .map((player, i) => (
                <Box
                  key={player.playerId}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <Typography
                    variant="body2"
                    sx={{ opacity: 0.5, width: '1.5em', textAlign: 'right' }}
                  >
                    {i + 1}.
                  </Typography>
                  <Typography variant="body1" sx={{ flex: 1 }}>
                    {player.name}
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {score?.[player.playerId] ?? 0}
                  </Typography>
                </Box>
              ))}
          </Stack>
          <Stack spacing={1.5}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={() => router.push('/')}
            >
              HOME
            </Button>
            {isHost && (
              <Button variant="contained" color="success" fullWidth onClick={playAgain}>
                PLAY AGAIN
              </Button>
            )}
            {nextGame && (
              <Button
                variant="outlined"
                fullWidth
                component={Link}
                href={`/game/${nextGame}`}
              >
                JOIN NEXT GAME
              </Button>
            )}
          </Stack>
        </DialogContent>
      </Dialog>
      {!isMobile && (
        <NotificationController
          showNotification={showYourTurn}
          onClose={() => updateState({ showYourTurn: false })}
          userName={playerName}
        />
      )}
    </>
  )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { gameId } = context.params as { gameId: string }
  const userAgent = context.req.headers['user-agent'] || ''
  const isMobile = Boolean(
    userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i)
  )
  return { props: { gameId, isMobile } }
}

export default GameWithAnimation
