import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createChromeMock, flushPromises } from '../utils/chrome'

const mockArtService = {
  handleInstalled: vi.fn(),
  initializeArt: vi.fn(),
  rotateToNext: vi.fn(),
  switchProvider: vi.fn(),
  setTurnoverAlways: vi.fn(),
}

vi.mock('../../src/background/container', () => ({
  artService: mockArtService,
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

    mockArtService.handleInstalled.mockResolvedValue(undefined)
    mockArtService.initializeArt.mockResolvedValue({
      asset: { id: '1', provider: 'google-arts' },
      imageUrl: 'data:image/1',
      totalAssets: 3,
      currentIndex: 1,
      userSettings: {
        ART_PROVIDER: 'google-arts',
        TURNOVER_ALWAYS: true,
      },
    })
    mockArtService.rotateToNext.mockResolvedValue({
      type: 'artUpdated',
      asset: { id: '1', provider: 'google-arts' },
      imageUrl: 'data:image/1',
      totalAssets: 3,
      currentIndex: 1,
      userSettings: {
        ART_PROVIDER: 'google-arts',
        TURNOVER_ALWAYS: false,
      },
    })
    mockArtService.switchProvider.mockResolvedValue({
      type: 'artUpdated',
      asset: { id: '0', provider: 'met-museum' },
      imageUrl: 'data:image/0',
      totalAssets: 2,
      currentIndex: 0,
      userSettings: {
        ART_PROVIDER: 'met-museum',
        TURNOVER_ALWAYS: false,
      },
    })
    mockArtService.setTurnoverAlways.mockResolvedValue({
      type: 'settingsUpdated',
      userSettings: {
        ART_PROVIDER: 'google-arts',
        TURNOVER_ALWAYS: true,
      },
    })

    await import('../../src/background/background')
  })

  it('initializes art and responds to the sender tab', async () => {
    const addListener = chrome.runtime.onMessage.addListener as ReturnType<
      typeof vi.fn
    >
    const listener = addListener.mock.calls[0][0]

    listener({ type: 'initializeArt' }, { tab: { id: 11 } })
    await flushPromises(20)

    expect(mockArtService.initializeArt).toHaveBeenCalled()
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      11,
      expect.objectContaining({ type: 'initializeArtResponse' }),
    )
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
    await flushPromises(20)

    expect(mockArtService.setTurnoverAlways).toHaveBeenCalledWith(true)
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
    await flushPromises(20)

    expect(mockArtService.rotateToNext).toHaveBeenCalled()
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ type: 'artUpdated' }),
    )
  })
})
