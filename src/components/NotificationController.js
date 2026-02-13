import { useState, useEffect, useRef, useContext, useCallback } from 'react'
import dynamic from 'next/dynamic'
import SettingsContext from '../context/SettingsContext'

const Notification = dynamic(
  () => import('react-web-notification').then((mod) => mod.default || mod),
  {
    ssr: false,
    loading: () => null,
  }
)

function NotificationController({ showNotification, userName, onClose }) {
  const [ignore, setIgnore] = useState(false)
  const soundRef = useRef(null)
  const { mute } = useContext(SettingsContext)

  useEffect(() => {
    if (navigator) {
      navigator.serviceWorker.register('/sw.js')
    }
  }, [])

  const handlePermissionGranted = useCallback(() => {
    console.log('Permission Granted')
    setIgnore(false)
  }, [])

  const handlePermissionDenied = useCallback(() => {
    console.log('Permission Denied')
    setIgnore(true)
  }, [])

  const handleNotSupported = useCallback(() => {
    console.log('Web Notification not Supported')
    setIgnore(true)
  }, [])

  const handleNotificationOnClose = useCallback(() => {
    onClose()
  }, [onClose])

  const playSound = useCallback(() => {
    if (soundRef.current) {
      soundRef.current.play()
    }
  }, [])

  const handleNotificationOnShow = useCallback(() => {
    if (!mute) {
      playSound()
    }
  }, [mute, playSound])

  if (!showNotification) {
    return null
  }

  return (
    <div>
      <Notification
        ignore={ignore}
        askAgain={true}
        notSupported={handleNotSupported}
        onPermissionGranted={handlePermissionGranted}
        onPermissionDenied={handlePermissionDenied}
        onShow={handleNotificationOnShow}
        onClose={handleNotificationOnClose}
        timeout={2000}
        title={'oopsie poopsie...'}
        options={{
          body: `your turn, ${userName}`,
          icon: '/images/poop.png',
          tag: 'your-turn',
        }}
      />
      <audio id="sound" preload="auto" ref={soundRef}>
        <source src="/audio/notification.mp3" type="audio/mpeg" />
        <embed
          hidden={true}
          autostart="false"
          loop={false}
          src="/audio/notification.mp3"
        />
      </audio>
    </div>
  )
}

export default NotificationController
