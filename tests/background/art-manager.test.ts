import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExtensionStorage } from '../../src/background/storage'
import { PROVIDERS, STORAGE_KEYS } from '../../src/types'

class FakeGoogleProvider {
  name = PROVIDERS.GOOGLE_ARTS
  displayName = 'Google Arts & Culture'

  syncData = vi.fn().mockResolvedValue(true)
  getAsset = vi.fn().mockResolvedValue(null)
  loadImage = vi.fn().mockResolvedValue(true)
  syncedAssetCount = vi.fn().mockResolvedValue(10)
  findNextValidAssetIndex = vi.fn().mockResolvedValue(0)
  getDisplayImageUrl = vi.fn().mockResolvedValue('data:image/mock')
  getDetailsUrl = vi.fn().mockReturnValue('https://example.com/detail')
}

class FakeMetProvider {
  name = PROVIDERS.MET_MUSEUM
  displayName = 'Metropolitan Museum of Art'

  syncData = vi.fn().mockResolvedValue(true)
  getAsset = vi.fn().mockResolvedValue(null)
  loadImage = vi.fn().mockResolvedValue(true)
  syncedAssetCount = vi.fn().mockResolvedValue(5)
  findNextValidAssetIndex = vi.fn().mockResolvedValue(0)
  getDisplayImageUrl = vi.fn().mockResolvedValue('data:image/mock')
  getDetailsUrl = vi.fn().mockReturnValue('https://example.com/detail')
}

vi.mock('../../src/background/providers/google-arts-provider', () => ({
  GoogleArtsProvider: FakeGoogleProvider,
}))

vi.mock('../../src/background/providers/met-museum-provider', () => ({
  MetMuseumProvider: FakeMetProvider,
}))

describe('ArtManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads state from storage when present', async () => {
    vi.spyOn(ExtensionStorage, 'readData').mockResolvedValue(
      JSON.stringify({
        provider: PROVIDERS.MET_MUSEUM,
        currentIndex: 4,
        turnoverAlways: true,
      }),
    )

    const { ArtManager } = await import('../../src/background/art-manager')
    const manager = new ArtManager()

    await manager.loadState()

    expect(await manager.getCurrentIndex()).toBe(4)
    expect(await manager.getUserSettings()).toEqual({
      ART_PROVIDER: PROVIDERS.MET_MUSEUM,
      TURNOVER_ALWAYS: true,
    })
  })

  it('persists updated turnover setting', async () => {
    vi.spyOn(ExtensionStorage, 'readData').mockResolvedValue(null)
    const writeSpy = vi
      .spyOn(ExtensionStorage, 'writeData')
      .mockResolvedValue(undefined)

    const { ArtManager } = await import('../../src/background/art-manager')
    const manager = new ArtManager()

    await manager.setTurnoverAlways(true)

    expect(writeSpy).toHaveBeenCalledWith(
      STORAGE_KEYS.ART_STATE,
      expect.stringContaining('"turnoverAlways":true'),
    )
  })

  it('updates provider and turnover settings', async () => {
    vi.spyOn(ExtensionStorage, 'readData').mockResolvedValue(null)
    vi.spyOn(ExtensionStorage, 'writeData').mockResolvedValue(undefined)

    const { ArtManager } = await import('../../src/background/art-manager')
    const manager = new ArtManager()

    await manager.setTurnoverAlways(true)
    await manager.setCurrentProvider(PROVIDERS.MET_MUSEUM)

    expect(await manager.getUserSettings()).toEqual({
      ART_PROVIDER: PROVIDERS.MET_MUSEUM,
      TURNOVER_ALWAYS: true,
    })
  })

  it('delegates next-valid-index lookup to current provider', async () => {
    vi.spyOn(ExtensionStorage, 'readData').mockResolvedValue(null)

    const { ArtManager } = await import('../../src/background/art-manager')
    const fakeProvider = new FakeGoogleProvider()
    const manager = new ArtManager([fakeProvider])

    await manager.findNextValidAssetIndex(2, 10)

    expect(fakeProvider.findNextValidAssetIndex).toHaveBeenCalledWith(2, 10)
  })

  it('migrates legacy lastUpdated into lastRotatedAt', async () => {
    const legacyTimestamp = 1700000000000
    vi.spyOn(ExtensionStorage, 'readData').mockResolvedValue(
      JSON.stringify({
        provider: PROVIDERS.GOOGLE_ARTS,
        currentIndex: 1,
        turnoverAlways: false,
        lastUpdated: legacyTimestamp,
      }),
    )

    const { ArtManager } = await import('../../src/background/art-manager')
    const manager = new ArtManager()

    await manager.loadState()

    expect(await manager.getLastRotatedAt()).toBe(legacyTimestamp)
  })

  it('does not change lastRotatedAt when updating turnover setting', async () => {
    const baselineRotationTimestamp = 1700000000000
    vi.spyOn(ExtensionStorage, 'readData').mockResolvedValue(
      JSON.stringify({
        provider: PROVIDERS.GOOGLE_ARTS,
        currentIndex: 0,
        turnoverAlways: false,
        lastRotatedAt: baselineRotationTimestamp,
      }),
    )
    vi.spyOn(ExtensionStorage, 'writeData').mockResolvedValue(undefined)

    const { ArtManager } = await import('../../src/background/art-manager')
    const manager = new ArtManager()

    await manager.loadState()
    await manager.setTurnoverAlways(true)

    expect(await manager.getLastRotatedAt()).toBe(baselineRotationTimestamp)
  })

  it('updates lastRotatedAt when current index changes', async () => {
    vi.useFakeTimers()
    try {
      const initialTime = new Date('2026-01-01T00:00:00.000Z')
      const rotationTime = new Date('2026-01-02T00:00:00.000Z')

      vi.setSystemTime(initialTime)
      vi.spyOn(ExtensionStorage, 'readData').mockResolvedValue(
        JSON.stringify({
          provider: PROVIDERS.GOOGLE_ARTS,
          currentIndex: 0,
          turnoverAlways: false,
          lastRotatedAt: initialTime.getTime(),
        }),
      )
      vi.spyOn(ExtensionStorage, 'writeData').mockResolvedValue(undefined)

      const { ArtManager } = await import('../../src/background/art-manager')
      const manager = new ArtManager()

      await manager.loadState()
      vi.setSystemTime(rotationTime)
      await manager.setCurrentIndex(2)

      expect(await manager.getLastRotatedAt()).toBe(rotationTime.getTime())
    } finally {
      vi.useRealTimers()
    }
  })
})
