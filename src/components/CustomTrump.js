import { useState } from 'react'
import { InputGroup, Input, Button } from 'reactstrap'

const CustomTrump = () => {
  const [trumpName, setTrumpName] = useState(
    localStorage.getItem('trumpNamePref') || 'trump'
  )

  const [editMode, setEditMode] = useState(false)

  const save = () => {
    setEditMode(false)
    localStorage.setItem('trumpNamePref', trumpName)
  }

  return (
    <>
      {editMode ? (
        <InputGroup>
          <Input
            value={trumpName}
            onChange={(e) => setTrumpName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                save()
              }
            }}
          />
          <Button color="primary" onClick={save}>
            save
          </Button>
        </InputGroup>
      ) : (
        <h3 onClick={() => setEditMode(true)}>{trumpName}</h3>
      )}
      <style jsx>{`
        h3 {
          text-transform: uppercase;
        }
        h3:hover {
          cursor: crosshair;
        }
      `}</style>
    </>
  )
}

export default CustomTrump
