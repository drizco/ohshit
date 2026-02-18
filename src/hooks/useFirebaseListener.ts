import { useEffect, useRef, useState } from 'react'
import { onValue, onChildAdded, onChildChanged, onChildRemoved } from 'firebase/database'
import type { DatabaseReference, DataSnapshot } from 'firebase/database'

type FirebaseEventType = 'value' | 'child_added' | 'child_changed' | 'child_removed'

interface UseFirebaseListenerOptions {
  ref: DatabaseReference | null
  enabled?: boolean
  eventType?: FirebaseEventType | FirebaseEventType[]
  onData?: (snapshot: DataSnapshot, eventType: FirebaseEventType) => void
  onError?: (error: Error) => void
}

/**
 * Generic Firebase listener hook that handles common patterns:
 * - Single value listener (onValue)
 * - Child event listeners (onChildAdded, onChildChanged, onChildRemoved)
 * - Load initial data + stream updates pattern
 * - Conditional enabling/disabling
 * - Automatic cleanup
 */
const useFirebaseListener = ({
  ref,
  enabled = true,
  eventType = 'value',
  onData,
  onError,
}: UseFirebaseListenerOptions) => {
  const [error, setError] = useState<Error | null>(null)
  const unsubscribesRef = useRef<(() => void)[]>([])

  // Store callbacks in refs so they can change without re-running the effect
  const onDataRef = useRef(onData)
  const onErrorRef = useRef(onError)

  // Update refs when callbacks change
  useEffect(() => {
    onDataRef.current = onData
    onErrorRef.current = onError
  }, [onData, onError])

  useEffect(() => {
    // Don't set up listeners if disabled or no ref
    if (!enabled || !ref) {
      return
    }

    const eventTypes = Array.isArray(eventType) ? eventType : [eventType]

    const setupListeners = async () => {
      try {
        setError(null)

        // Set up Firebase listeners
        eventTypes.forEach((type) => {
          let unsubscribe

          switch (type) {
            case 'value':
              unsubscribe = onValue(
                ref,
                (snapshot) => {
                  try {
                    onDataRef.current?.(snapshot, 'value')
                  } catch (err) {
                    const error = err instanceof Error ? err : new Error(String(err))
                    onErrorRef.current?.(error)
                    setError(error)
                  }
                },
                (err) => {
                  const error = err instanceof Error ? err : new Error(String(err))
                  onErrorRef.current?.(error)
                  setError(error)
                }
              )
              break

            case 'child_added':
              unsubscribe = onChildAdded(
                ref,
                (snapshot) => {
                  try {
                    onDataRef.current?.(snapshot, 'child_added')
                  } catch (err) {
                    const error = err instanceof Error ? err : new Error(String(err))
                    onErrorRef.current?.(error)
                    setError(error)
                  }
                },
                (err) => {
                  const error = err instanceof Error ? err : new Error(String(err))
                  onErrorRef.current?.(error)
                  setError(error)
                }
              )
              break

            case 'child_changed':
              unsubscribe = onChildChanged(
                ref,
                (snapshot) => {
                  try {
                    onDataRef.current?.(snapshot, 'child_changed')
                  } catch (err) {
                    const error = err instanceof Error ? err : new Error(String(err))
                    onErrorRef.current?.(error)
                    setError(error)
                  }
                },
                (err) => {
                  const error = err instanceof Error ? err : new Error(String(err))
                  onErrorRef.current?.(error)
                  setError(error)
                }
              )
              break

            case 'child_removed':
              unsubscribe = onChildRemoved(
                ref,
                (snapshot) => {
                  try {
                    onDataRef.current?.(snapshot, 'child_removed')
                  } catch (err) {
                    const error = err instanceof Error ? err : new Error(String(err))
                    onErrorRef.current?.(error)
                    setError(error)
                  }
                },
                (err) => {
                  const error = err instanceof Error ? err : new Error(String(err))
                  onErrorRef.current?.(error)
                  setError(error)
                }
              )
              break

            default:
              console.warn(`Unknown event type: ${type}`)
          }

          if (unsubscribe) {
            unsubscribesRef.current.push(unsubscribe)
          }
        })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        onError?.(error)
        setError(error)
      }
    }

    setupListeners()

    // Cleanup function
    return () => {
      unsubscribesRef.current.forEach((unsubscribe) => unsubscribe?.())
      unsubscribesRef.current = []
    }
    // Only re-run when ref, enabled, or eventType change - NOT when callbacks change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, enabled, eventType])

  return { error }
}

export default useFirebaseListener
