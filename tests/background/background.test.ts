import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createChromeMock, flushPromises } from '../utils/chrome'

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
  toJSON: vi.fn().mockReturnValue({ id, provider }),
  isValid: vi.fn().mockReturnValue(true),
})

const mockManager = {
  loadState: vi.fn(),
  syncData: vi.fn(),
  syncedAssetCount: vi.fn(),
  getCurrentIndex: vi.fn(),
  setCurrentIndex: vi.fn(),
  loadImage: vi.fn(),
  getAsset: vi.fn(),
  getDisplayImageUrl: vi.fn(),
  getUserSettings: vi.fn(),
  getLastUpdated: vi.fn(),
  setTurnoverAlways: vi.fn(),
  setCurrentProvider: vi.fn(),
  getCurrentProviderSync: vi.fn(),
}

vi.mock('../../src/background/art-manager', () => ({
  instance: mockManager,
}))

describe('background message handlers', () => {
  beforeEach(async () => {
    vi.resetModules()

    const chromeMock = createChromeMock()
    chromeMock.tabs.query.mockImplementation(
      (_q: unknown, cb: (tabs: chrome.tabs.Tab[]) => void) => {
        cb([{ id: 1, url: 'about:newtab' } as chrome.tabs.Tab])
      },
    )
    vi.stubGlobal('chrome', chromeMock)

    mockManager.loadState.mockResolvedValue(undefined)
    mockManager.syncData.mockResolvedValue(true)
    mockManager.syncedAssetCount.mockResolvedValue(3)
    mockManager.getCurrentIndex.mockResolvedValue(0)
    mockManager.setCurrentIndex.mockResolvedValue(undefined)
    mockManager.loadImage.mockResolvedValue(true)
    mockManager.getAsset.mockImplementation(async (index: number) =>
      createAsset(String(index)),
    )
    mockManager.getDisplayImageUrl.mockImplementation(async (index: number) =>
      `data:image/${index}`,
    )
    mockManager.getUserSettings.mockResolvedValue({
      ART_PROVIDER: 'google-arts',
      TURNOVER_ALWAYS: false,
    })
    mockManager.getLastUpdated.mockResolvedValue(Date.now())
    mockManager.setTurnoverAlways.mockResolvedValue(undefined)
    mockManager.setCurrentProvider.mockResolvedValue(undefined)
    mockManager.getCurrentProviderSync.mockReturnValue({ name: 'google-arts' })

    await import('../../src/background/background')
  })

  it('initializes art and prefetches next image when turnoverAlways is enabled', async () => {
    mockManager.getUserSettings.mockResolvedValue({
      ART_PROVIDER: 'google-arts',
      TURNOVER_ALWAYS: true,
    })

    const addListener = chrome.runtime.onMessage.addListener as ReturnType<
      typeof vi.fn
    >
    const listener = addListener.mock.calls[0][0]

    listener({ type: 'initializeArt' }, { tab: { id: 11 } })
    await flushPromises(5)

    expect(mockManager.syncData).toHaveBeenCalled()
    expect(mockManager.getCurrentIndex).toHaveBeenCalled()
    expect(mockManager.setCurrentIndex).toHaveBeenCalledWith(1)
  })

  it('broadcasts settingsUpdated for setTurnoverAlways', async () => {
    const chromeMock = chrome as unknown as ReturnType<typeof createChromeMock>
    chromeMock.tabs.query.mockImplementation(
      (_q: unknown, cb: (tabs: chrome.tabs.Tab[]) => void) => {
        cb([
          { id: 101, url: 'about:newtab' } as chrome.tabs.Tab,
          { id: 202, url: 'https://example.com' } as chrome.tabs.Tab,
        ])
      },
    )

    const addListener = chrome.runtime.onMessage.addListener as ReturnType<
      typeof vi.fn
    >
    const listener = addListener.mock.calls[0][0]

    listener({ type: 'setTurnoverAlways', turnoverAlwaysEnabled: true }, {})
    await flushPromises(4)

    expect(mockManager.setTurnoverAlways).toHaveBeenCalledWith(true)
    expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1)
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      101,
      expect.objectContaining({ type: 'settingsUpdated' }),
    )
  })

  it('rotates to next asset and notifies newtab pages', async () => {
    const addListener = chrome.runtime.onMessage.addListener as ReturnType<
      typeof vi.fn
    >
    const listener = addListener.mock.calls[0][0]

    listener({ type: 'rotateToNext' }, {})
    await flushPromises(4)

    expect(mockManager.setCurrentIndex).toHaveBeenCalledWith(1)
    expect(mockManager.getAsset).toHaveBeenCalledWith(1)
    expect(mockManager.getDisplayImageUrl).toHaveBeenCalledWith(1)
  })
})
