import { useEffect, useRef, useContext } from 'react'
import { useRouter } from 'next/router'
import type { GetServerSidePropsContext } from 'next'
import Link from 'next/link'
import { Container, Button, Row, Col, Modal, ModalBody, ModalHeader } from 'reactstrap'
import AppStateContext from '../../context/AppStateContext'
import SettingsContext from '../../context/SettingsContext'
import TimerContext from '../../context/TimerContext'
import styles from '../../styles/pages/game.module.scss'
import CardRow from '../../components/CardRow'
import { getSource, getAvailableTricks, getWinner } from '../../utils/helpers'
import Players from '../../components/Players'
import NotificationController from '../../components/NotificationController'
import CustomTrump from '../../components/CustomTrump'
import TurnChange from '../../components/TurnChange'
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
  const { dark } = useContext(SettingsContext)
  const { timer } = useContext(TimerContext)

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
  const { trickIndex, roundScore, isHost, winner, trick, leadSuit } = computed

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

  // Handle "your turn" logic
  useEffect(() => {
    const currentPlayerId = game?.state?.playerOrder?.[game.state.currentPlayerIndex]
    if (game && currentPlayerId === playerId && game.state?.status === 'play') {
      yourTurn()
    }
  }, [game, playerId, yourTurn])

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

  const status = game.state?.status
  const currentPlayerIndex = game.state?.currentPlayerIndex
  const playerOrder = game.state?.playerOrder || []
  const currentPlayer = playerOrder[currentPlayerIndex]
  const dealerIndex = game.state?.dealerIndex ?? 0
  const dealer = playerOrder[dealerIndex]
  const roundNum = game.state?.roundNum
  const numRounds = game.state?.numRounds
  const numCards = game.state?.numCards || game.settings?.numCards
  const name = game.metadata?.name
  const nextGame = game.state?.nextGame
  const timeLimit = game.settings?.timeLimit

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

  return (
    <>
      <div className={styles.game_page}>
        <CountdownOverlay
          timeRemaining={timer}
          isVisible={
            !!timeLimit &&
            playerId === currentPlayer &&
            timer >= 0 &&
            timer <= timerShowMax
          }
        />
        <Row className={styles.info_row}>
          <Col xs="4">
            {name && <h2 style={{ textDecoration: 'underline' }}>{name}</h2>}
          </Col>
          <Col xs="4">
            {isHost && status && status === 'pending' && (
              <Row>
                <Button color="success" onClick={startGameHandler}>
                  START GAME
                </Button>
              </Row>
            )}
            {status && (status === 'bid' || status === 'play' || status === 'over') && (
              <>
                <h4>{`ROUND: ${roundNum} of ${numRounds}`}</h4>
                <h4>{`TOTAL TRICKS: ${numCards}`}</h4>
                <h4>{`TRICKS AVAILABLE: ${getAvailableTricks({
                  numCards,
                  bids,
                })}`}</h4>
              </>
            )}
          </Col>
          <Col xs="2" className={styles.lead_trump_container}>
            {leadSuit && (
              <>
                <h3>LEAD</h3>
                <img src={getSource(leadSuit, dark)} />
              </>
            )}
          </Col>
          <Col xs="2" className={styles.lead_trump_container}>
            {trump && (
              <>
                <CustomTrump />
                <img src={getSource(trump, dark)} />
              </>
            )}
          </Col>
        </Row>
        {!playerId && (
          <JoinGameForm
            playerName={playerName}
            onPlayerNameChange={handleChange}
            onJoin={addPlayer}
          />
        )}
        <Players
          players={players}
          currentPlayer={currentPlayer}
          bids={bids}
          roundScore={roundScore}
          trick={trick}
          bid={bid}
          dealer={dealer}
          handleToggle={handleToggle}
          submitBid={submitBid}
          afterBid={() => updateState({ bid: 0 })}
          thisPlayer={playerId || ''}
          score={score}
          timeLimit={timeLimit}
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
      <Modal
        centered
        isOpen={Boolean(lastWinner)}
        toggle={closeModal}
        onOpened={() => {
          setTimeout(() => {
            closeModal()
          }, 1000)
        }}
      >
        <ModalBody>
          <Container className="text-align-center">
            {lastWinner && (
              <h2 className="mb-3">{`${getWinner({ winner: lastWinner, players })} won!`}</h2>
            )}
            <Button onClick={closeModal}>CLOSE</Button>
          </Container>
        </ModalBody>
      </Modal>
      <Modal centered isOpen={status === 'over'}>
        <ModalHeader>
          <Row>
            <Col className="d-flex justify-content-center mb-3">
              <h1>game over</h1>
            </Col>
          </Row>
        </ModalHeader>
        <ModalBody>
          {Object.values(players)
            .sort((a, b) => {
              const aScore = score && score[a.playerId] ? score[a.playerId] : 0
              const bScore = score && score[b.playerId] ? score[b.playerId] : 0
              if (aScore < bScore) {
                return 1
              }
              if (aScore > bScore) {
                return -1
              }
              return 0
            })
            .map((player) => (
              <Row key={player.playerId}>
                <Col xs="6">
                  <h5>{player.name}</h5>
                </Col>
                <Col xs="6">
                  <h5 style={{ textAlign: 'center' }}>
                    {score && score[player.playerId] ? score[player.playerId] : '0'}
                  </h5>
                </Col>
              </Row>
            ))}
          <Row>
            <Col>
              {status === 'over' ? (
                <>
                  <div className="mt-3 text-center">
                    <Button
                      color="primary"
                      onClick={() => {
                        router.push('/')
                      }}
                    >
                      HOME
                    </Button>
                  </div>
                  {isHost && (
                    <div className="mt-3 text-center">
                      <Button color="success" onClick={playAgain}>
                        PLAY AGAIN
                      </Button>
                    </div>
                  )}
                  {nextGame && (
                    <div className="mt-3 text-center">
                      <Link href={`/game/${nextGame}`}>JOIN NEXT GAME</Link>
                    </div>
                  )}
                </>
              ) : (
                <Button color="primary" onClick={closeModal}>
                  CLOSE
                </Button>
              )}
            </Col>
          </Row>
        </ModalBody>
      </Modal>
      {(status === 'play' || status === 'bid') && (
        <TurnChange
          timeLimit={timeLimit}
          playerId={playerId || ''}
          currentPlayer={currentPlayer}
          winner={winner || null}
          randomPlay={randomPlay}
          yourTurn={yourTurn}
        />
      )}
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
