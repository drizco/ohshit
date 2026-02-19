import classNames from 'classnames'
import { useContext } from 'react'
import {
  Button,
  Col,
  Container,
  Form,
  Input,
  InputGroup,
  Modal,
  ModalBody,
  Row,
} from 'reactstrap'
import SettingsContext from '../context/SettingsContext'
import TimerContext from '../context/TimerContext'
import styles from '../styles/components/players.module.scss'
import { getColor, getSource } from '../utils/helpers'
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
  winnerModalShowing,
  status,
}: PlayersProps) => {
  const { dark } = useContext(SettingsContext)
  const { timer } = useContext(TimerContext)
  const newPlayers = playerOrder.length > 0
    ? playerOrder.map((id) => players[id]).filter(Boolean)
    : Object.values(players)

  return (
    <ul className={styles.players}>
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
              <Row
                className={classNames({
                  [styles.current_player_arrow]: isCurrent,
                  [styles.player_row]: true,
                  'player-row': true,
                })}
              >
                <Col xs="4" className="d-flex align-items-center">
                  <div className="player-score" data-player-score={playerScore}>
                    {timeLimit &&
                      thisPlayer !== currentPlayer &&
                      currentPlayer === playerId &&
                      timer >= 0 &&
                      timer <= timerShowMax && (
                        <div className={styles.countdown}>
                          <h1 className="red-text">{timer}</h1>
                        </div>
                      )}
                    <h2
                      className={classNames({
                        [styles.current_player]: isCurrent,
                        [styles.not_present]: !present,
                        [styles.dealer]: isDealer,
                        'player-name': true,
                      })}
                    >
                      {name}
                    </h2>
                  </div>
                </Col>
                {bids && bids[playerId] != null && (
                  <Col xs="3" sm="4" className="d-flex align-items-center">
                    <Row>
                      <Col xs="12" sm="6">
                        <h3>{`Bid: ${bids[playerId]}`}</h3>
                      </Col>
                      <Col xs="12" sm="6">
                        <h3>{`Won: ${roundScore[playerId] || '0'}`}</h3>
                      </Col>
                    </Row>
                  </Col>
                )}
                {trick && trick.cards && trick.cards[playerId] && (
                  <Col xs="5" sm="4">
                    <div className={styles.card}>
                      <img src={getSource(trick.cards[playerId].suit, dark)} />
                      <h2
                        style={{
                          color: getColor(trick.cards[playerId].suit, dark),
                        }}
                      >
                        {trick.cards[playerId].value}
                      </h2>
                    </div>
                  </Col>
                )}
              </Row>
              <Modal
                centered
                isOpen={
                  status === 'bid' &&
                  !winnerModalShowing &&
                  thisPlayer === playerId &&
                  currentPlayer === playerId
                }
                onClosed={afterBid}
              >
                <ModalBody>
                  <Container>
                    <Row className="text-center">
                      <h1>Bid</h1>
                    </Row>
                    <Row className="justify-content-center mb-3">
                      <div>
                        {newPlayers &&
                          newPlayers
                            .filter((p) => !!bids && bids[p.playerId] != null)
                            .map(({ playerId, name }) => (
                              <h2
                                className="mb-2"
                                key={playerId}
                              >{`${name}: ${bids?.[playerId]}`}</h2>
                            ))}
                      </div>
                    </Row>
                    <Row className="justify-content-center">
                      <Form>
                        <InputGroup>
                          <Button
                            className={styles.toggle_button}
                            color="danger"
                            onClick={(e) =>
                              handleToggle(false, (e.target as HTMLButtonElement).value)
                            }
                          >
                            -
                          </Button>
                          <Input
                            data-lpignore="true"
                            type="text"
                            value={bid}
                            name="bid"
                            id="bid"
                            className={classNames(styles.toggle_results, 'main-text')}
                            readOnly
                          />
                          <Button
                            className={styles.toggle_button}
                            color="success"
                            onClick={(e) =>
                              handleToggle(true, (e.target as HTMLButtonElement).value)
                            }
                          >
                            +
                          </Button>
                        </InputGroup>
                      </Form>
                    </Row>
                    <Row className="justify-content-center mt-5">
                      <Button
                        className={styles.bid_button}
                        color="primary"
                        onClick={() => submitBid()}
                      >
                        BID
                      </Button>
                    </Row>
                  </Container>
                </ModalBody>
              </Modal>
            </li>
          )
        })}
    </ul>
  )
}

export default Players
