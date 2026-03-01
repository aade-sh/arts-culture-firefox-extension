import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClevelandMuseumProvider } from '../../../src/background/providers/cleveland-museum-provider'
import { CacheManager } from '../../../src/background/cache-manager'

describe('ClevelandMuseumProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('uses cached asset data when available', async () => {
    const cache = new CacheManager()
    vi.spyOn(cache, 'getCachedData').mockResolvedValue([
      {
        id: '94979',
        title: 'Nathaniel Hurd',
        creator: 'John Singleton Copley',
        attribution: '1915.534',
        remoteImageUrl:
          'https://openaccess-cdn.clevelandart.org/1915.534/1915.534_web.jpg',
        detailsUrl: 'https://clevelandart.org/art/1915.534',
        provider: 'cleveland-museum',
      },
    ])

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const provider = new ClevelandMuseumProvider(cache)
    const success = await provider.syncData()

    expect(success).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(await provider.syncedAssetCount()).toBe(1)
  })

  it('fetches and filters invalid assets when cache is empty', async () => {
    const cache = new CacheManager()
    vi.spyOn(cache, 'getCachedData').mockResolvedValue(null)
    const setCachedData = vi.spyOn(cache, 'setCachedData').mockResolvedValue(undefined)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 94979,
              title: 'Valid',
              creators: [{ role: 'artist', description: 'Artist Name' }],
              images: {
                web: {
                  url: 'https://openaccess-cdn.clevelandart.org/valid.jpg',
                },
              },
            },
            {
              id: 94980,
              title: 'Invalid',
              creators: [{ role: 'artist', description: 'Artist Name' }],
              images: {
                web: {
                  url: '',
                },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    )

    const provider = new ClevelandMuseumProvider(cache)
    const success = await provider.syncData()

    expect(success).toBe(true)
    expect(await provider.syncedAssetCount()).toBe(1)
    expect(setCachedData).toHaveBeenCalled()
  })

  it('returns null for out-of-range asset index', async () => {
    const cache = new CacheManager()
    vi.spyOn(cache, 'getCachedData').mockResolvedValue([
      {
        id: '94979',
        title: 'Nathaniel Hurd',
        creator: 'John Singleton Copley',
        attribution: '1915.534',
        remoteImageUrl:
          'https://openaccess-cdn.clevelandart.org/1915.534/1915.534_web.jpg',
        detailsUrl: 'https://clevelandart.org/art/1915.534',
        provider: 'cleveland-museum',
      },
    ])

    const provider = new ClevelandMuseumProvider(cache)
    await provider.syncData()

    expect(await provider.getAsset(3)).toBeNull()
  })
})
