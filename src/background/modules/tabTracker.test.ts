import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TabTracker } from './tabTracker'

// ---------------------------------------------------------------------------
// Mock factories — TabTracker never calls Chrome APIs directly, so no chrome
// global is needed. It only talks to these two injected collaborators.
// ---------------------------------------------------------------------------

const makeStorageMock = () => ({
  getLocalDateString: vi.fn(() => '2026-03-03'),
  updateTimeOnly: vi.fn(async () => {}),
  updateInfo: vi.fn(async () => {}),
  getTotalDomainTime: vi.fn(async () => 0),
})

const makeBadgeMock = () => ({
  startBadgeUpdates: vi.fn(async () => {}),
  resumeBadgeUpdates: vi.fn(async () => {}),
  stopBadgeUpdates: vi.fn(),
  clearBadge: vi.fn(),
  pauseBadgeUpdates: vi.fn(),
  updateBadge: vi.fn(async () => {}),
  isUpdating: vi.fn(() => true),
  paused: false,
})

const makeBlockMock = () => ({
  isBlocked: vi.fn(async () => null),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type StorageMock = ReturnType<typeof makeStorageMock>
type BadgeMock = ReturnType<typeof makeBadgeMock>

function setupTracking(
  tracker: TabTracker,
  storage: StorageMock,
  opts: {
    startTime?: number
    lastTickTime?: number
    accumulatedTime?: number
    domain?: string
    currentDate?: string
  } = {}
) {
  tracker.currentTab.domain = opts.domain ?? 'example.com'
  tracker.currentTab.startTime = opts.startTime ?? Date.now()
  tracker.currentTab.lastTickTime = opts.lastTickTime ?? Date.now()
  tracker.currentTab.accumulatedTime = opts.accumulatedTime ?? 0
  tracker.currentTab.currentDate = opts.currentDate ?? storage.getLocalDateString()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

type BlockMock = ReturnType<typeof makeBlockMock>

describe('TabTracker', () => {
  let tracker: TabTracker
  let storage: StorageMock
  let badge: BadgeMock
  let block: BlockMock

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-03T12:00:00.000Z'))
    storage = makeStorageMock()
    badge = makeBadgeMock()
    block = makeBlockMock()
    tracker = new TabTracker(storage as any, badge as any, block as any)
  })

  afterEach(() => {
    tracker.cleanup()
    vi.useRealTimers()
  })

  // -------------------------------------------------------------------------
  // adjustForSleep
  // -------------------------------------------------------------------------

  describe('adjustForSleep', () => {
    it('credits only pre-sleep time when gap exceeds threshold', async () => {
      const T = Date.now()
      setupTracking(tracker, storage, {
        startTime: T,
        lastTickTime: T + 30_000, // last tick 30s into the session
      })

      // Wake 90s after the last tick — a 90s gap clearly exceeds the 60s threshold
      vi.setSystemTime(T + 30_000 + 90_000)

      await tracker.saveTime()

      // Only the 30s between startTime and lastTickTime should be credited
      expect(storage.updateTimeOnly).toHaveBeenCalledWith('example.com', 30, expect.any(String))
    })

    it('saves nothing when lid is closed at the very start of a session', async () => {
      const T = Date.now()
      // startTime === lastTickTime: no elapsed time before sleep
      setupTracking(tracker, storage, { startTime: T, lastTickTime: T })

      vi.setSystemTime(T + 300_000) // sleep for 5 minutes immediately

      await tracker.saveTime()

      // validElapsed = lastTickTime - startTime = 0, so totalTime = 0 → nothing saved
      expect(storage.updateTimeOnly).not.toHaveBeenCalled()
    })

    it('is a no-op for a normal 30s interval gap', async () => {
      const T = Date.now()
      setupTracking(tracker, storage, { startTime: T, lastTickTime: T })

      vi.setSystemTime(T + 30_000) // a normal tick, well below the 60s threshold

      await tracker.saveTime()

      // Full 30s counted with no sleep discount
      expect(storage.updateTimeOnly).toHaveBeenCalledWith('example.com', 30, expect.any(String))
    })

    it('does not track time when lastTickTime is null (service worker just restarted)', async () => {
      const T = Date.now()
      tracker.currentTab.domain = 'example.com'
      tracker.currentTab.startTime = T
      tracker.currentTab.lastTickTime = null // fresh restart, no ticks yet
      tracker.currentTab.accumulatedTime = 0
      tracker.currentTab.currentDate = storage.getLocalDateString()

      vi.setSystemTime(T + 30_000)

      await tracker.saveTime()

      // adjustForSleep returns early when lastTickTime is null;
      // elapsed since startTime (30s) is still counted normally
      expect(storage.updateTimeOnly).toHaveBeenCalledWith('example.com', 30, expect.any(String))
    })
  })

  // -------------------------------------------------------------------------
  // Concurrent-save protection (reset-before-await)
  // -------------------------------------------------------------------------

  describe('concurrent save protection', () => {
    it('two concurrent saveTime() calls only save the first', async () => {
      const T = Date.now()
      setupTracking(tracker, storage, { startTime: T - 60_000 }) // 60s session

      // State is reset synchronously inside saveTime() before the first await,
      // so the second call sees totalTime ≈ 0 and does nothing.
      await Promise.all([tracker.saveTime(), tracker.saveTime()])

      expect(storage.updateTimeOnly).toHaveBeenCalledTimes(1)
      expect(storage.updateTimeOnly).toHaveBeenCalledWith('example.com', 60, expect.any(String))
    })

    it('saveTime() racing with a slow storage write does not double-save', async () => {
      let resolveFirst!: () => void
      storage.updateTimeOnly.mockImplementationOnce(
        () => new Promise<void>(r => (resolveFirst = r))
      )

      const T = Date.now()
      setupTracking(tracker, storage, { startTime: T - 60_000 })

      const first = tracker.saveTime() // resets state, then blocks on slow storage
      const second = tracker.saveTime() // state already reset → totalTime = 0 → skips save

      resolveFirst()
      await Promise.all([first, second])

      expect(storage.updateTimeOnly).toHaveBeenCalledTimes(1)
    })

    it('two concurrent saveInfo() calls only save the first', async () => {
      const T = Date.now()
      setupTracking(tracker, storage, { startTime: T - 45_000 }) // 45s session

      await Promise.all([tracker.saveInfo(), tracker.saveInfo()])

      expect(storage.updateInfo).toHaveBeenCalledTimes(1)
      expect(storage.updateInfo).toHaveBeenCalledWith('example.com', 45, expect.any(String))
    })

    it('date-change interval: second tick skips when currentDate already updated', async () => {
      let resolveFirstSave!: () => void
      storage.updateTimeOnly.mockImplementationOnce(
        () => new Promise<void>(r => (resolveFirstSave = r))
      )

      const T = Date.now()

      // resumeTracking() exits early when domain is null, so set it first.
      tracker.currentTab.domain = 'example.com'
      await tracker.resumeTracking()
      tracker.currentTab.startTime = T - 86_400_000 // 24h ago
      tracker.currentTab.lastTickTime = T            // last tick was "just now"
      tracker.currentTab.currentDate = '2026-03-02'
      storage.getLocalDateString.mockReturnValue('2026-03-03')

      // First tick (T+30s): detects date change, resets currentDate synchronously,
      // then blocks on the slow storage call.
      await vi.advanceTimersByTimeAsync(30_000)

      // Second tick (T+60s): sees currentDate already updated to '2026-03-03',
      // skips the date-change block entirely.
      await vi.advanceTimersByTimeAsync(30_000)

      // updateTimeOnly was called exactly once (by the first tick).
      // The second tick never called it because currentDate was already updated.
      expect(storage.updateTimeOnly).toHaveBeenCalledTimes(1)

      // Resolve the pending first save and stop the interval (avoids infinite-loop
      // detection if vi.runAllTimersAsync were called).
      resolveFirstSave()
      tracker.cleanup()
    })
  })
})
