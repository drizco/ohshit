import { useEffect, useRef, useState } from 'react'
import { onValue, onChildAdded, onChildChanged, onChildRemoved } from 'firebase/database'

/**
 * Generic Firebase listener hook that handles common patterns:
 * - Single value listener (onValue)
 * - Child event listeners (onChildAdded, onChildChanged, onChildRemoved)
 * - Load initial data + stream updates pattern
 * - Conditional enabling/disabling
 * - Automatic cleanup
 *
 * @param {Object} options
 * @param {Object} options.ref - Firebase database reference
 * @param {boolean} options.enabled - Whether listener is active (default: true)
 * @param {string|string[]} options.eventType - Firebase event type(s): 'value', 'child_added', 'child_changed', 'child_removed', or array
 * @param {boolean} options.initialLoad - Whether to load initial data with get() before setting up listeners (default: false)
 * @param {Function} options.onData - Callback when data is received: (snapshot, eventType) => void
 * @param {Function} options.onError - Callback when error occurs: (error) => void
 * @param {Function} options.shouldSkip - Optional predicate to skip processing: (snapshot) => boolean (for deduplication)
 * @returns {Object} { loading, error }
 */
const useFirebaseListener = ({
  ref,
  enabled = true,
  eventType = 'value',
  onData,
  onError,
}) => {
  const [error, setError] = useState(null)
  const unsubscribesRef = useRef([])

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
                    onData?.(snapshot, 'value')
                  } catch (err) {
                    onError?.(err)
                    setError(err)
                  }
                },
                (err) => {
                  onError?.(err)
                  setError(err)
                }
              )
              break

            case 'child_added':
              unsubscribe = onChildAdded(
                ref,
                (snapshot) => {
                  try {
                    onData?.(snapshot, 'child_added')
                  } catch (err) {
                    onError?.(err)
                    setError(err)
                  }
                },
                (err) => {
                  onError?.(err)
                  setError(err)
                }
              )
              break

            case 'child_changed':
              unsubscribe = onChildChanged(
                ref,
                (snapshot) => {
                  try {
                    onData?.(snapshot, 'child_changed')
                  } catch (err) {
                    onError?.(err)
                    setError(err)
                  }
                },
                (err) => {
                  onError?.(err)
                  setError(err)
                }
              )
              break

            case 'child_removed':
              unsubscribe = onChildRemoved(
                ref,
                (snapshot) => {
                  try {
                    onData?.(snapshot, 'child_removed')
                  } catch (err) {
                    onError?.(err)
                    setError(err)
                  }
                },
                (err) => {
                  onError?.(err)
                  setError(err)
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
        onError?.(err)
        setError(err)
      }
    }

    setupListeners()

    // Cleanup function
    return () => {
      unsubscribesRef.current.forEach((unsubscribe) => unsubscribe?.())
      unsubscribesRef.current = []
    }
  }, [ref, enabled, eventType, onData, onError])

  return { error }
}

export default useFirebaseListener
