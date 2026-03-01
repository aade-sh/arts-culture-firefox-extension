import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExtensionStorage } from '../../src/background/storage'
import { PROVIDERS, STORAGE_KEYS } from '../../src/types'

class FakeGoogleProvider {
  name = PROVIDERS.GOOGLE_ARTS as const
  displayName = 'Google Arts & Culture'

  syncData = vi.fn().mockResolvedValue(true)
  getAsset = vi.fn().mockResolvedValue(null)
  loadImage = vi.fn().mockResolvedValue(true)
  syncedAssetCount = vi.fn().mockResolvedValue(10)
  getDisplayImageUrl = vi.fn().mockResolvedValue('data:image/mock')
  getDetailsUrl = vi.fn().mockReturnValue('https://example.com/detail')
}

class FakeMetProvider {
  name = PROVIDERS.MET_MUSEUM as const
  displayName = 'Metropolitan Museum of Art'

  syncData = vi.fn().mockResolvedValue(true)
  getAsset = vi.fn().mockResolvedValue(null)
  loadImage = vi.fn().mockResolvedValue(true)
  syncedAssetCount = vi.fn().mockResolvedValue(5)
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

  it('routes setUserSetting for provider and turnover', async () => {
    vi.spyOn(ExtensionStorage, 'readData').mockResolvedValue(null)
    vi.spyOn(ExtensionStorage, 'writeData').mockResolvedValue(undefined)

    const { ArtManager } = await import('../../src/background/art-manager')
    const manager = new ArtManager()

    await manager.setUserSetting({ key: 'turnoverAlways', value: true })
    await manager.setUserSetting({ key: 'artProvider', value: PROVIDERS.MET_MUSEUM })

    expect(await manager.getUserSettings()).toEqual({
      ART_PROVIDER: PROVIDERS.MET_MUSEUM,
      TURNOVER_ALWAYS: true,
    })
  })
})
