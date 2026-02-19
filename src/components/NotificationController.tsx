import { useEffect, useRef, useContext } from 'react'
import SettingsContext from '../context/SettingsContext'
import { useNotification } from '../hooks/useNotification'

interface NotificationControllerProps {
  showNotification: boolean
  userName: string
  onClose: () => void
}

function NotificationController({
  showNotification,
  userName,
  onClose,
}: NotificationControllerProps) {
  const { mute } = useContext(SettingsContext)
  const { showNotification: show, requestPermission } = useNotification()
  const soundRef = useRef<HTMLAudioElement>(null)

  // Request permission on mount
  useEffect(() => {
    requestPermission()
  }, [requestPermission])

  // Show notification when triggered
  useEffect(() => {
    if (showNotification) {
      const notification = show('oh shit...', {
        body: `your turn, ${userName}`,
        icon: '/images/poop.png',
        tag: 'your-turn',
      })

      if (notification) {
        notification.onclick = () => {
          window.focus()
          notification.close()
        }
        notification.onclose = onClose

        setTimeout(() => notification.close(), 2000)
      }

      // Play sound
      if (!mute && soundRef.current) {
        soundRef.current.play().catch((error) => {
          // Ignore autoplay errors (user hasn't interacted with page yet)
          console.log('Audio play failed:', error.message)
        })
      }
    }
  }, [showNotification, userName, show, onClose, mute])

  return (
    <audio ref={soundRef} preload="auto">
      <source src="/audio/notification.mp3" type="audio/mpeg" />
    </audio>
  )
}

export default NotificationController
