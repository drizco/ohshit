import { useEffect, useCallback, useRef } from 'react'

export function useNotification() {
  const permissionRef = useRef<NotificationPermission>('default')

  useEffect(() => {
    if ('Notification' in window) {
      permissionRef.current = Notification.permission
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      permissionRef.current = permission
      return permission
    }
    return permissionRef.current
  }, [])

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        return new Notification(title, options)
      }
      return null
    },
    []
  )

  return { requestPermission, showNotification, permission: permissionRef.current }
}
