import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ArtService } from '../../src/background/art-service'

const createAsset = (id: string, provider = 'google-arts') => ({
  id,
  title: `Title ${id}`,
  creator: 'Artist',
  attribution: '',
  remoteImageUrl: `https://img.example/${id}`,
  detailsUrl: `detail-${id}`,
  provider,
  isImageCached: vi.fn().mockResolvedValue(false),
  getDisplayImageUrl: vi.fn().mockResolvedValue(`https://img.example/${id}`),
  getProcessedImageUrl: vi.fn().mockReturnValue(`https://img.example/${id}`),
  getDetailsUrl: vi.fn().mockReturnValue(`https://details.example/${id}`),
  toJSON: vi.fn().mockReturnValue({
    id,
    title: `Title ${id}`,
    creator: 'Artist',
    attribution: '',
    remoteImageUrl: `https://img.example/${id}`,
    detailsUrl: `detail-${id}`,
    provider,
  }),
  isValid: vi.fn().mockReturnValue(true),
})

const createManagerMock = () => ({
  ensureInitialized: vi.fn().mockResolvedValue(undefined),
  syncData: vi.fn().mockResolvedValue(true),
  syncedAssetCount: vi.fn().mockResolvedValue(3),
  getCurrentIndex: vi.fn().mockResolvedValue(0),
  setCurrentIndex: vi.fn().mockResolvedValue(undefined),
  loadImage: vi.fn().mockResolvedValue(true),
  getAsset: vi.fn(async (index: number) => createAsset(String(index))),
  findNextValidAssetIndex: vi.fn(async (startIndex: number) => startIndex),
  getDisplayImageUrl: vi.fn(async (index: number) => `data:image/${index}`),
  getUserSettings: vi.fn().mockResolvedValue({
    ART_PROVIDER: 'google-arts',
    TURNOVER_ALWAYS: true,
  }),
  getLastRotatedAt: vi.fn().mockResolvedValue(Date.now()),
  setTurnoverAlways: vi.fn().mockResolvedValue(undefined),
  setCurrentProvider: vi.fn().mockResolvedValue(undefined),
})

describe('ArtService', () => {
  let manager: ReturnType<typeof createManagerMock>
  let service: ArtService

  beforeEach(() => {
    manager = createManagerMock()
    service = new ArtService(manager)
  })

  it('initializes art and rotates when turnoverAlways is enabled', async () => {
    const result = await service.initializeArt()

    expect(manager.ensureInitialized).toHaveBeenCalled()
    expect(manager.findNextValidAssetIndex).toHaveBeenCalledWith(1, 3)
    expect(manager.setCurrentIndex).toHaveBeenCalledWith(1)
    if ('error' in result) {
      throw new Error(`expected initialize success, got error: ${result.error}`)
    }
    expect(result.currentIndex).toBe(1)
    expect(result.imageUrl).toBe('data:image/1')
  })

  it('returns artUpdated payload when rotating', async () => {
    const result = await service.rotateToNext()

    expect(result).not.toBeNull()
    expect(manager.findNextValidAssetIndex).toHaveBeenCalledWith(1, 3)
    expect(manager.setCurrentIndex).toHaveBeenCalledWith(1)
    expect(result?.type).toBe('artUpdated')
    expect(result?.currentIndex).toBe(1)
  })

  it('returns settingsUpdated payload for turnover toggle', async () => {
    const result = await service.setTurnoverAlways(true)

    expect(manager.setTurnoverAlways).toHaveBeenCalledWith(true)
    expect(result.type).toBe('settingsUpdated')
    expect(result.userSettings.TURNOVER_ALWAYS).toBe(true)
  })

  it('switches provider and returns artUpdated payload', async () => {
    const result = await service.switchProvider('met-museum')

    expect(manager.setCurrentProvider).toHaveBeenCalledWith('met-museum')
    expect(result).not.toBeNull()
    expect(result?.type).toBe('artUpdated')
  })
})
