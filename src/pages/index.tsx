import { useState, useRef, useContext, useEffect } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Container from '@mui/material/Container'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import OutlinedInput from '@mui/material/OutlinedInput'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { newGame, parseApiError } from '../utils/api'
import styles from '../styles/pages/home.module.scss'
import AppStateContext from '../context/AppStateContext'
import classnames from 'classnames'

const CreateGame = () => {
  const router = useRouter()
  const [name, setName] = useState('')
  const [game, setGame] = useState('')
  const [gameCode, setGameCode] = useState('')
  const [gameId, setGameId] = useState('')
  const [url, setUrl] = useState('')
  const [copySuccess, setCopySuccess] = useState('')
  const [dirty, setDirty] = useState(false)
  const [bidPoints, setBidPoints] = useState(false)
  const [timeLimit, setTimeLimit] = useState('')
  const [numCards, setNumCards] = useState(5)
  const [create, setCreate] = useState(true)

  const gameUrlRef = useRef<HTMLInputElement>(null)

  const { setLoading, setError } = useContext(AppStateContext)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(localStorage.getItem('player-name') || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name: fieldName, value } = e.target
    switch (fieldName) {
      case 'name':
        setName(value)
        break
      case 'game':
        setGame(value)
        break
      case 'game-code':
        setGameCode(value)
        break
      default:
        break
    }
  }

  const handleNumCards = (inc: boolean) => {
    const newNumCards = inc ? numCards + 1 : numCards - 1
    if (newNumCards <= 10 && newNumCards >= 1) {
      setNumCards(newNumCards)
    }
  }

  const initializeGame = async () => {
    try {
      setLoading(true)
      const body = {
        game,
        name,
        numCards,
        bidPoints,
        dirty,
        timeLimit: timeLimit ? Number(timeLimit) : null,
      }
      const response = await newGame(body)
      if (response.ok) {
        const { playerId, gameId: gameIdResponse } = await response.json()
        localStorage.setItem(`oh-shit-${gameIdResponse}-player-id`, playerId)
        localStorage.setItem(`player-name`, name)
        setGameId(gameIdResponse)
        const origin = window.location.origin
        setUrl(`${origin}/game/${gameIdResponse}`)
        setName('')
        setGame('')
      } else {
        const message = await parseApiError(response, 'Failed to create game')
        setError(message)
      }
      setLoading(false)
    } catch {
      setLoading(false)
      setError('Failed to create game')
    }
  }

  const joinGame = () => {
    router.push(`/game/${gameCode}`)
  }

  const copyToClipboard = (e: MouseEvent) => {
    gameUrlRef.current?.select()
    document.execCommand('copy')
    ;(e.target as HTMLElement)?.focus()
    setCopySuccess('Copied!')
  }

  return (
    <Container id={styles.home}>
      {gameId ? (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'center', m: 4 }}>
            <Box sx={{ width: { xs: '83.33%', sm: '58.33%' } }}>
              <h2>Game Code</h2>
              <h2 className={classnames(styles.suit_red, styles.game_code)}>{gameId}</h2>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'center', m: 4 }}>
            <h3>Share this link to invite other players</h3>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <Box sx={{ width: { xs: '83.33%', sm: '58.33%' } }}>
              <OutlinedInput
                fullWidth
                value={url}
                readOnly
                inputRef={gameUrlRef}
                endAdornment={
                  <InputAdornment position="end">
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      aria-label="Copy game URL"
                      className={styles.copy_button}
                    >
                      <ContentCopyIcon sx={{ fontSize: 18 }} />
                    </button>
                  </InputAdornment>
                }
              />
              <h6 className={styles.copied}>{copySuccess}</h6>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'center', m: 5 }}>
            <Link href={`/game/${gameId}`} className={styles.enter_game_button}>
              ENTER GAME
            </Link>
          </Box>
        </>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ width: { xs: '100%', sm: '75%' } }}>
            <Box sx={{ my: 5 }}>
              <div
                role="tablist"
                aria-label="Game options"
                className={styles.tab_row}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') setCreate(false)
                  else if (e.key === 'ArrowLeft') setCreate(true)
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <button
                    role="tab"
                    type="button"
                    id="tab-create"
                    aria-selected={create}
                    aria-controls="panel-create"
                    tabIndex={create ? 0 : -1}
                    className={classnames({
                      [styles.toggle]: true,
                      [styles.selected]: create,
                    })}
                    onClick={() => setCreate(true)}
                  >
                    create a new game
                  </button>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <button
                    role="tab"
                    type="button"
                    id="tab-join"
                    aria-selected={!create}
                    aria-controls="panel-join"
                    tabIndex={create ? -1 : 0}
                    className={classnames({
                      [styles.toggle]: true,
                      [styles.selected]: !create,
                    })}
                    onClick={() => setCreate(false)}
                  >
                    join an existing game
                  </button>
                </Box>
              </div>
            </Box>
          </Box>
          <Box sx={{ width: { xs: '83.33%', sm: '58.33%' } }}>
            <div
              id="panel-create"
              role="tabpanel"
              aria-labelledby="tab-create"
              hidden={!create}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  initializeGame()
                }}
              >
                <TextField
                  fullWidth
                  label="Game Name"
                  id="game"
                  name="game"
                  value={game}
                  onChange={handleChange}
                  placeholder="optional"
                  autoComplete="off"
                  sx={{ mb: 2 }}
                />
                <TextField
                  key={isClient ? 'client' : 'server'}
                  fullWidth
                  label="Player Name"
                  id="name"
                  name="name"
                  autoComplete="nickname"
                  value={name}
                  onChange={handleChange}
                  sx={{ mb: 2 }}
                />

                <Box sx={{ mb: 2 }}>
                  <label htmlFor="num-cards" className={styles.num_cards_label}>
                    Number of cards
                  </label>
                  <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => handleNumCards(false)}
                    >
                      -
                    </Button>
                    <input
                      type="text"
                      value={numCards}
                      name="num-cards"
                      id="num-cards"
                      className={styles.num_cards}
                      readOnly
                    />
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleNumCards(true)}
                    >
                      +
                    </Button>
                  </Box>
                </Box>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="time-limit-label">Time limit</InputLabel>
                  <Select
                    labelId="time-limit-label"
                    id="time-limit"
                    value={timeLimit}
                    label="Time limit"
                    onChange={(e) => setTimeLimit(String(e.target.value))}
                  >
                    <MenuItem value="">None</MenuItem>
                    <MenuItem value="90">90 seconds</MenuItem>
                    <MenuItem value="60">60 seconds</MenuItem>
                    <MenuItem value="30">30 seconds</MenuItem>
                    <MenuItem value="10">10 seconds</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Checkbox
                      id="bid-checkbox"
                      checked={dirty}
                      onChange={() => setDirty(!dirty)}
                    />
                  }
                  label="Dirty bids only"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      id="bid-point-checkbox"
                      checked={bidPoints}
                      onChange={() => setBidPoints(!bidPoints)}
                    />
                  }
                  label="Earn points for bad bids"
                />

                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!name}
                    color="primary"
                  >
                    NEW GAME
                  </Button>
                </Box>
              </form>
            </div>
            <div
              id="panel-join"
              role="tabpanel"
              aria-labelledby="tab-join"
              hidden={create}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  joinGame()
                }}
              >
                <TextField
                  fullWidth
                  label="Game Code"
                  id="game-code"
                  name="game-code"
                  value={gameCode}
                  onChange={handleChange}
                  placeholder="Jb2X"
                  autoComplete="off"
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={gameCode.length < 4}
                    color="primary"
                  >
                    JOIN GAME
                  </Button>
                </Box>
              </form>
            </div>
          </Box>
        </Box>
      )}
    </Container>
  )
}

export default CreateGame
