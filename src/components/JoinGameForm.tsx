import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import type { ChangeEvent } from 'react'

interface JoinGameFormProps {
  playerName: string
  onPlayerNameChange: (e: ChangeEvent<HTMLInputElement>) => void
  onJoin: () => void
}

/**
 * JoinGameForm - Player name input and join button
 */
const JoinGameForm = ({ playerName, onPlayerNameChange, onJoin }: JoinGameFormProps) => {
  return (
    <Box sx={{ mb: 5 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onJoin()
        }}
      >
        <TextField
          fullWidth
          label="Player Name"
          id="name"
          name="playerName"
          autoComplete="nickname"
          value={playerName || ''}
          onChange={onPlayerNameChange}
          sx={{ mb: 2 }}
        />
        <Button type="submit" variant="contained" color="success" disabled={!playerName}>
          JOIN
        </Button>
      </form>
    </Box>
  )
}

export default JoinGameForm
