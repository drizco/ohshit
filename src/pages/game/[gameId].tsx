import { useEffect, useRef, useContext } from 'react'
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

// Custom hooks
import useGameState from '../../hooks/useGameState'
import useGameComputed from '../../hooks/useGameComputed'
import useGameListeners from '../../hooks/useGameListeners'
import useGameActions from '../../hooks/useGameActions'

interface GameProps {
  gameId: string
  isMobile: boolean
}

function Game({ gameId, isMobile }: GameProps) {
  const router = useRouter()
  const { visible, setError, setLoading } = useContext(AppStateContext)

  // Hook #1: State Management
  const { state, updateState, dispatchRound, roundState, initializeGame } = useGameState({
    gameId,
  })

  const {
    game,
    players,
    playerId,
    playerName,
    hand,
    bid,
    showYourTurn,
    queuedCard,
    lastWinner,
  } = state
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

  // Hook #3: Firebase Listeners
  const { removeListeners } = useGameListeners({
    gameId,
    playerId,
    roundId: game?.state?.roundId || null,
    updateState,
    dispatchRound,
    setError,
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
    closeModal,
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
                variant="h5"
                component="h2"
                sx={{ textDecoration: 'underline', fontWeight: 'bold' }}
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
              <>
                <p className={styles.game_info}>{`ROUND: ${roundNum} of ${numRounds}`}</p>
                <p className={styles.game_info}>{`TOTAL TRICKS: ${numCards}`}</p>
                <p className={styles.game_info}>{`TRICKS AVAILABLE: ${getAvailableTricks({
                  numCards,
                  bids,
                })}`}</p>
              </>
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
          bids={bids}
          roundScore={roundScore}
          trick={trick}
          bid={bid}
          dealer={dealer}
          handleToggle={handleToggle}
          submitBid={() => submitBid()}
          afterBid={() => updateState({ bid: 0 })}
          thisPlayer={playerId || ''}
          score={score}
          timeLimit={timeLimit}
          timeRemaining={timeRemaining}
          winnerModalShowing={Boolean(lastWinner)}
          status={status}
        />
      </div>
      <YourTurnIndicator isYourTurn={playerId === currentPlayer && status === 'play'} />
      <CardRow
        cards={hand}
        playCard={playCard}
        queuedCard={queuedCard}
        leadSuit={leadSuit || null}
      />
      {/* Trick winner flash modal */}
      <Dialog
        open={Boolean(lastWinner)}
        onClose={closeModal}
        slotProps={{
          transition: {
            onEntered: () => {
              setTimeout(() => {
                closeModal()
              }, 1000)
            },
          },
        }}
      >
        <DialogContent sx={{ textAlign: 'center' }}>
          {lastWinner && (
            <Typography
              variant="h5"
              component="h2"
              sx={{ mb: 2, fontWeight: 'bold' }}
            >{`${getWinner({ winner: lastWinner, players })} won!`}</Typography>
          )}
          <Button variant="outlined" onClick={closeModal}>
            CLOSE
          </Button>
        </DialogContent>
      </Dialog>
      {/* Game over modal */}
      <Dialog open={status === 'over'} onClose={() => {}}>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <h1>game over</h1>
          </Box>
        </DialogTitle>
        <DialogContent>
          {Object.values(players)
            .sort((a, b) => {
              const aScore = score && score[a.playerId] ? score[a.playerId] : 0
              const bScore = score && score[b.playerId] ? score[b.playerId] : 0
              if (aScore < bScore) return 1
              if (aScore > bScore) return -1
              return 0
            })
            .map((player) => (
              <Box key={player.playerId} sx={{ display: 'flex' }}>
                <Box sx={{ flex: 1 }}>
                  <h5>{player.name}</h5>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <h5>
                    {score && score[player.playerId] ? score[player.playerId] : '0'}
                  </h5>
                </Box>
              </Box>
            ))}
          <Box>
            {status === 'over' ? (
              <>
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      router.push('/')
                    }}
                  >
                    HOME
                  </Button>
                </Box>
                {isHost && (
                  <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Button variant="contained" color="success" onClick={playAgain}>
                      PLAY AGAIN
                    </Button>
                  </Box>
                )}
                {nextGame && (
                  <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Link href={`/game/${nextGame}`}>JOIN NEXT GAME</Link>
                  </Box>
                )}
              </>
            ) : (
              <Button variant="contained" color="primary" onClick={closeModal}>
                CLOSE
              </Button>
            )}
          </Box>
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

export default Game
