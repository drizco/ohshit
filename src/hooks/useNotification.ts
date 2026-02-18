import { useEffect, useCallback, useState } from 'react'

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if ('Notification' in window) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const newPermission = await Notification.requestPermission()
      setPermission(newPermission)
      return newPermission
    }
    return Notification.permission
  }, [])

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      return new Notification(title, options)
    }
    return null
  }, [])

  return { requestPermission, showNotification, permission }
}
