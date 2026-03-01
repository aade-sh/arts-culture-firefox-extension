import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GoogleArtsProvider } from '../../../src/background/providers/google-arts-provider'
import { Cache } from '../../../src/background/cache-manager'

describe('GoogleArtsProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('uses cached asset data when available', async () => {
    vi.spyOn(Cache, 'getCachedData').mockResolvedValue([
      {
        id: 'g1',
        title: 'Cached Art',
        creator: 'Artist',
        attribution: '',
        remoteImageUrl: 'https://img.example/1',
        detailsUrl: 'detail-1',
        provider: 'google-arts',
      },
    ])

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const provider = new GoogleArtsProvider()
    const success = await provider.syncData()

    expect(success).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(await provider.syncedAssetCount()).toBe(1)
  })

  it('fetches and filters invalid assets when cache is empty', async () => {
    vi.spyOn(Cache, 'getCachedData').mockResolvedValue(null)
    const setCachedData = vi
      .spyOn(Cache, 'setCachedData')
      .mockResolvedValue(undefined)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 'valid',
            title: 'Valid',
            creator: 'Artist',
            image: 'https://img.example/valid',
            link: 'valid-link',
          },
          {
            id: 'invalid',
            title: 'Missing image',
            creator: 'Artist',
            image: '',
            link: 'invalid-link',
          },
        ]),
        { status: 200 },
      ),
    )

    const provider = new GoogleArtsProvider()
    const success = await provider.syncData()

    expect(success).toBe(true)
    expect(await provider.syncedAssetCount()).toBe(1)
    expect(setCachedData).toHaveBeenCalled()
  })

  it('returns null for out-of-range asset index', async () => {
    vi.spyOn(Cache, 'getCachedData').mockResolvedValue([
      {
        id: 'g1',
        title: 'Cached Art',
        creator: 'Artist',
        attribution: '',
        remoteImageUrl: 'https://img.example/1',
        detailsUrl: 'detail-1',
        provider: 'google-arts',
      },
    ])

    const provider = new GoogleArtsProvider()
    await provider.syncData()

    expect(await provider.getAsset(99)).toBeNull()
  })
})
