import { jest } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

let useTimer

beforeAll(async () => {
  const mod = await import('@/hooks/useTimer')
  useTimer = mod.useTimer
})

describe('useTimer', () => {
  let mockRandomPlay
  const NOW = 1_700_000_000_000 // fixed "now" timestamp

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
    mockRandomPlay = jest.fn()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // Factory so randomPlay always refers to the current mockRandomPlay
  const props = (overrides = {}) => ({
    timeLimit: 30,
    turnStartedAt: NOW - 5_000, // 5 seconds ago → 25s remaining
    playerId: 'p1',
    currentPlayer: 'p1',
    randomPlay: mockRandomPlay,
    ...overrides,
  })

  test('returns null when timeLimit is null', () => {
    const { result } = renderHook(() => useTimer(props({ timeLimit: null })))
    expect(result.current.timeRemaining).toBeNull()
  })

  test('returns null when turnStartedAt is null', () => {
    const { result } = renderHook(() => useTimer(props({ turnStartedAt: null })))
    expect(result.current.timeRemaining).toBeNull()
  })

  test('computes initial timeRemaining from turnStartedAt', () => {
    const { result } = renderHook(() => useTimer(props()))
    // 5s elapsed, 30s limit → 25s remaining
    expect(result.current.timeRemaining).toBe(25)
  })

  test('decrements timeRemaining as time passes', () => {
    const { result } = renderHook(() => useTimer(props()))
    expect(result.current.timeRemaining).toBe(25)

    act(() => {
      jest.advanceTimersByTime(5_000) // 5 more seconds pass
    })
    expect(result.current.timeRemaining).toBe(20)
  })

  test('floors timeRemaining at 0 (never goes negative)', () => {
    const { result } = renderHook(
      () => useTimer(props({ turnStartedAt: NOW - 35_000 })) // 35s ago, limit 30
    )
    expect(result.current.timeRemaining).toBe(0)
  })

  test('calls randomPlay when time reaches 0 and it is the player turn', () => {
    renderHook(() => useTimer(props({ turnStartedAt: NOW - 29_000 }))) // 1s remaining

    act(() => {
      jest.advanceTimersByTime(1_500)
    })

    expect(mockRandomPlay).toHaveBeenCalledTimes(1)
  })

  test('does not call randomPlay when it is not the player turn', () => {
    renderHook(() =>
      useTimer(props({ currentPlayer: 'p2', turnStartedAt: NOW - 29_000 }))
    )

    act(() => {
      jest.advanceTimersByTime(2_000)
    })

    expect(mockRandomPlay).not.toHaveBeenCalled()
  })

  test('fires randomPlay only once per turn even after multiple ticks at 0', () => {
    renderHook(() => useTimer(props({ turnStartedAt: NOW - 29_000 })))

    act(() => {
      jest.advanceTimersByTime(5_000) // well past 0
    })

    expect(mockRandomPlay).toHaveBeenCalledTimes(1)
  })

  test('resets and allows randomPlay again when turnStartedAt changes', () => {
    const { rerender } = renderHook((p) => useTimer(p), {
      initialProps: props({ turnStartedAt: NOW - 29_000 }),
    })

    act(() => {
      jest.advanceTimersByTime(2_000) // timer expires, randomPlay fires once
    })
    expect(mockRandomPlay).toHaveBeenCalledTimes(1)

    // New turn — use a distinct turnStartedAt that also has no time remaining
    // so the effect fires immediately on re-render (turnStartedAt in deps)
    act(() => {
      rerender(props({ turnStartedAt: NOW - 30_000 }))
    })
    expect(mockRandomPlay).toHaveBeenCalledTimes(2)
  })

  test('resets timeRemaining when turnStartedAt changes', () => {
    const { result, rerender } = renderHook((p) => useTimer(p), {
      initialProps: props(), // 5s ago → 25s remaining
    })
    expect(result.current.timeRemaining).toBe(25)

    act(() => {
      rerender(props({ turnStartedAt: NOW - 10_000 })) // 10s ago → 20s remaining
    })
    expect(result.current.timeRemaining).toBe(20)
  })
})
