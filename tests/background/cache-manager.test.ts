import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CacheManager } from '../../src/background/cache-manager'
import { ExtensionStorage } from '../../src/background/storage'
import { PROVIDERS, createCacheKey } from '../../src/types'

describe('CacheManager', () => {
  let cache: CacheManager

  beforeEach(() => {
    vi.restoreAllMocks()
    cache = new CacheManager()
  })

  it('returns null when cache is stale', async () => {
    vi.spyOn(ExtensionStorage, 'readData').mockImplementation(async (key) => {
      if (String(key).includes(':timestamp')) {
        return (Date.now() - 25 * 60 * 60 * 1000).toString()
      }
      return JSON.stringify({ hello: 'world' })
    })

    const result = await cache.getCachedData(PROVIDERS.GOOGLE_ARTS, 'assets')

    expect(result).toBeNull()
  })

  it('returns parsed cached data when cache is valid', async () => {
    vi.spyOn(ExtensionStorage, 'readData').mockImplementation(async (key) => {
      if (String(key).includes(':timestamp')) {
        return Date.now().toString()
      }
      return JSON.stringify({ hello: 'world' })
    })

    const result = await cache.getCachedData<{ hello: string }>(
      PROVIDERS.GOOGLE_ARTS,
      'assets',
    )

    expect(result).toEqual({ hello: 'world' })
  })

  it('returns null when cached json cannot be parsed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(ExtensionStorage, 'readData').mockImplementation(async (key) => {
      if (String(key).includes(':timestamp')) {
        return Date.now().toString()
      }
      return 'not-json'
    })

    const result = await cache.getCachedData(PROVIDERS.GOOGLE_ARTS, 'assets')

    expect(result).toBeNull()
    expect(warn).toHaveBeenCalled()
  })

  it('writes cached data and timestamp', async () => {
    const write = vi
      .spyOn(ExtensionStorage, 'writeData')
      .mockResolvedValue(undefined)

    await cache.setCachedData(PROVIDERS.GOOGLE_ARTS, 'assets', { x: 1 })

    expect(write).toHaveBeenCalledWith(
      createCacheKey(PROVIDERS.GOOGLE_ARTS, 'assets'),
      JSON.stringify({ x: 1 }),
    )
    expect(write).toHaveBeenCalledWith(
      createCacheKey(PROVIDERS.GOOGLE_ARTS, 'timestamp'),
      expect.any(String),
    )
  })

  it('uses existing cached image without fetching', async () => {
    const blobToDataUrl = vi
      .spyOn(cache, 'blobToDataUrl')
      .mockResolvedValue('data:image/mock')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const response = new Response(new Blob(['cached']))
    const getCachedImage = vi
      .spyOn(cache, 'getCachedImage')
      .mockResolvedValue(response)

    const result = await cache.loadAndCacheImage(
      PROVIDERS.GOOGLE_ARTS,
      'https://img.example/cached',
    )

    expect(getCachedImage).toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(blobToDataUrl).toHaveBeenCalled()
    expect(result).toBe('data:image/mock')
  })

  it('fetches and caches image when not cached', async () => {
    const blobToDataUrl = vi
      .spyOn(cache, 'blobToDataUrl')
      .mockResolvedValue('data:image/fetched')
    vi.spyOn(cache, 'getCachedImage').mockResolvedValue(undefined)
    const setCachedImage = vi
      .spyOn(cache, 'setCachedImage')
      .mockResolvedValue(undefined)

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(new Blob(['fetched']), { status: 200 }))

    const result = await cache.loadAndCacheImage(
      PROVIDERS.GOOGLE_ARTS,
      'https://img.example/new',
    )

    expect(fetchSpy).toHaveBeenCalledWith('https://img.example/new', {
      method: 'GET',
      headers: { Accept: 'image/*' },
    })
    expect(setCachedImage).toHaveBeenCalled()
    expect(result).toBe('data:image/fetched')
    expect(blobToDataUrl).toHaveBeenCalled()
  })
})
