import { describe, expect, it, vi } from 'vitest'
import { ExtensionStorage } from '../../src/background/storage'
import { STORAGE_KEYS, createCacheKey, PROVIDERS } from '../../src/types'

describe('ExtensionStorage', () => {
  it('writes and reads data via chrome.storage.local', async () => {
    const setSpy = vi.spyOn(chrome.storage.local, 'set')
    const getSpy = vi.spyOn(
      chrome.storage.local,
      'get',
    ) as unknown as ReturnType<typeof vi.fn>
    getSpy.mockResolvedValue({ [STORAGE_KEYS.ART_STATE]: 'state-json' })

    await ExtensionStorage.writeData(STORAGE_KEYS.ART_STATE, 'state-json')
    const value = await ExtensionStorage.readData(STORAGE_KEYS.ART_STATE)

    expect(setSpy).toHaveBeenCalledWith({ [STORAGE_KEYS.ART_STATE]: 'state-json' })
    expect(getSpy).toHaveBeenCalledWith([STORAGE_KEYS.ART_STATE])
    expect(value).toBe('state-json')
  })

  it('returns null when read key is missing', async () => {
    const getSpy = vi.spyOn(
      chrome.storage.local,
      'get',
    ) as unknown as ReturnType<typeof vi.fn>
    getSpy.mockResolvedValue({})

    const value = await ExtensionStorage.readData(
      createCacheKey(PROVIDERS.GOOGLE_ARTS, 'assets'),
    )

    expect(value).toBeNull()
  })

  it('delegates remove and clear', async () => {
    const removeSpy = vi.spyOn(chrome.storage.local, 'remove')
    const clearSpy = vi.spyOn(chrome.storage.local, 'clear')

    await ExtensionStorage.removeData(STORAGE_KEYS.ART_STATE)
    await ExtensionStorage.clear()

    expect(removeSpy).toHaveBeenCalledWith(STORAGE_KEYS.ART_STATE)
    expect(clearSpy).toHaveBeenCalled()
  })

  it('reads and writes image cache entries', async () => {
    const key = 'https://images.example/painting.jpg'
    const response = new Response(new Blob(['image']))

    await ExtensionStorage.setCachedImage(PROVIDERS.GOOGLE_ARTS, key, response)

    const cached = await ExtensionStorage.getCachedImage(PROVIDERS.GOOGLE_ARTS, key)
    expect(cached).toBeInstanceOf(Response)

    const cleared = await ExtensionStorage.clearImageCache(PROVIDERS.GOOGLE_ARTS)
    expect(cleared).toBe(true)
  })
})
