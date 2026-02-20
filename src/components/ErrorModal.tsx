import React, { useContext } from 'react'
import { Modal, ModalBody, Button } from 'reactstrap'
import AppStateContext from '../context/AppStateContext'

const ErrorModal = () => {
  const { error, setError } = useContext(AppStateContext)
  return (
    <Modal
      isOpen={!!error}
      toggle={() => {
        setError(null)
      }}
    >
      <ModalBody>
        <h2>Uh oh, something went wrong...</h2>
        {error && <p>{error}</p>}
        <Button color="secondary" onClick={() => setError(null)}>
          Dismiss
        </Button>
      </ModalBody>
    </Modal>
  )
}

export default ErrorModal
