import React, { useContext } from 'react'
import { Modal, ModalBody } from 'reactstrap'
import CombinedContext from '../context/CombinedContext'

const ErrorModal = () => {
  const { error, setState } = useContext(CombinedContext)
  return (
    <Modal
      isOpen={error}
      toggle={() => {
        setState({ error: !error })
      }}
    >
      <ModalBody>
        <h2>Uh oh, something went wrong...</h2>
      </ModalBody>
    </Modal>
  )
}

export default ErrorModal
