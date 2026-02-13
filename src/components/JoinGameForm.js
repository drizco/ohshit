import { Form, FormGroup, Label, Input, Button, Row, Col } from 'reactstrap'

/**
 * JoinGameForm - Player name input and join button
 *
 * @param {Object} props
 * @param {string} props.playerName - Current player name value
 * @param {Function} props.onPlayerNameChange - Handler for name input changes
 * @param {Function} props.onJoin - Handler for join button click
 * @returns {JSX.Element}
 */
const JoinGameForm = ({ playerName, onPlayerNameChange, onJoin }) => {
  return (
    <Col xs="4" className="mb-5">
      <Row>
        <Form>
          <FormGroup>
            <Label for="name">User Name</Label>
            <Input
              data-lpignore="true"
              type="text"
              name="playerName"
              id="name"
              value={playerName || ''}
              onChange={onPlayerNameChange}
            />
          </FormGroup>
          <Button disabled={!playerName} color="success" onClick={onJoin}>
            JOIN
          </Button>
        </Form>
      </Row>
    </Col>
  )
}

export default JoinGameForm
