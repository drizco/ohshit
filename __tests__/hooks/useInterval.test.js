import { jest } from '@jest/globals'
import { renderHook } from '@testing-library/react'
import useInterval from '@/hooks/useInterval'

describe('useInterval Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  test('calls callback on interval', () => {
    const callback = jest.fn()

    renderHook(() => useInterval(callback, 1000))

    expect(callback).not.toHaveBeenCalled()

    // Fast-forward 1 second
    jest.advanceTimersByTime(1000)
    expect(callback).toHaveBeenCalledTimes(1)

    // Fast-forward another second
    jest.advanceTimersByTime(1000)
    expect(callback).toHaveBeenCalledTimes(2)

    // Fast-forward 3 more seconds
    jest.advanceTimersByTime(3000)
    expect(callback).toHaveBeenCalledTimes(5)
  })

  test('clears interval on unmount', () => {
    const callback = jest.fn()

    const { unmount } = renderHook(() => useInterval(callback, 1000))

    jest.advanceTimersByTime(1000)
    expect(callback).toHaveBeenCalledTimes(1)

    // Unmount the hook
    unmount()

    // Advance timer - callback should not be called again
    jest.advanceTimersByTime(2000)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  test('updates interval when delay changes', () => {
    const callback = jest.fn()

    const { rerender } = renderHook(({ delay }) => useInterval(callback, delay), {
      initialProps: { delay: 1000 },
    })

    // Initial interval at 1000ms
    jest.advanceTimersByTime(1000)
    expect(callback).toHaveBeenCalledTimes(1)

    // Change delay to 500ms
    rerender({ delay: 500 })

    // Clear any pending timers and start fresh
    callback.mockClear()

    // New interval should fire at 500ms
    jest.advanceTimersByTime(500)
    expect(callback).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(500)
    expect(callback).toHaveBeenCalledTimes(2)
  })

  test('pauses interval when delay is null', () => {
    const callback = jest.fn()

    const { rerender } = renderHook(({ delay }) => useInterval(callback, delay), {
      initialProps: { delay: 1000 },
    })

    // Initial interval works
    jest.advanceTimersByTime(1000)
    expect(callback).toHaveBeenCalledTimes(1)

    // Set delay to null (pause)
    rerender({ delay: null })

    // Callback should not be called anymore
    jest.advanceTimersByTime(5000)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  test('resumes interval when delay changes from null to a value', () => {
    const callback = jest.fn()

    const { rerender } = renderHook(({ delay }) => useInterval(callback, delay), {
      initialProps: { delay: null },
    })

    // With null delay, callback should not be called
    jest.advanceTimersByTime(2000)
    expect(callback).not.toHaveBeenCalled()

    // Resume with delay of 1000ms
    rerender({ delay: 1000 })

    jest.advanceTimersByTime(1000)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  test('updates callback without restarting interval', () => {
    const callback1 = jest.fn()
    const callback2 = jest.fn()

    const { rerender } = renderHook(({ cb }) => useInterval(cb, 1000), {
      initialProps: { cb: callback1 },
    })

    jest.advanceTimersByTime(1000)
    expect(callback1).toHaveBeenCalledTimes(1)
    expect(callback2).not.toHaveBeenCalled()

    // Change callback
    rerender({ cb: callback2 })

    // Next interval should call new callback
    jest.advanceTimersByTime(1000)
    expect(callback1).toHaveBeenCalledTimes(1)
    expect(callback2).toHaveBeenCalledTimes(1)
  })
})
