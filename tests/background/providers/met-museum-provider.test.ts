import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MetMuseumProvider } from '../../../src/background/providers/met-museum-provider'
import { Cache } from '../../../src/background/cache-manager'

describe('MetMuseumProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('uses cached object ids when available', async () => {
    vi.spyOn(Cache, 'getCachedData').mockResolvedValue([111, 222])
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const provider = new MetMuseumProvider()
    const success = await provider.syncData()

    expect(success).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(await provider.syncedAssetCount()).toBe(2)
  })

  it('syncs ids from API when cache is empty', async () => {
    vi.spyOn(Cache, 'getCachedData').mockResolvedValue(null)
    const setCachedData = vi
      .spyOn(Cache, 'setCachedData')
      .mockResolvedValue(undefined)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ objectIDs: [10, 20, 30] }), { status: 200 }),
    )

    const provider = new MetMuseumProvider()
    const success = await provider.syncData()

    expect(success).toBe(true)
    expect(await provider.syncedAssetCount()).toBe(3)
    expect(setCachedData).toHaveBeenCalled()
  })

  it('returns null on out-of-range index', async () => {
    vi.spyOn(Cache, 'getCachedData').mockResolvedValue([1])

    const provider = new MetMuseumProvider()
    await provider.syncData()

    expect(await provider.getAsset(2)).toBeNull()
  })

  it('returns null when object fetch is rate-limited', async () => {
    vi.spyOn(Cache, 'getCachedData').mockResolvedValue([777])

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 403 }))

    const provider = new MetMuseumProvider()
    await provider.syncData()

    expect(await provider.getAsset(0)).toBeNull()
    expect(fetchSpy).toHaveBeenCalled()
  })

  it('returns valid mapped asset for public domain object', async () => {
    vi.spyOn(Cache, 'getCachedData').mockResolvedValue([888])

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          objectID: 888,
          title: 'The Gulf Stream',
          artistDisplayName: 'Winslow Homer',
          primaryImage: 'https://images.metmuseum.org/gulf-stream.jpg',
          objectURL: 'https://www.metmuseum.org/art/collection/search/888',
          isPublicDomain: true,
        }),
        { status: 200 },
      ),
    )

    const provider = new MetMuseumProvider()
    await provider.syncData()

    const asset = await provider.getAsset(0)
    expect(asset?.title).toBe('The Gulf Stream')
    expect(asset?.creator).toBe('Winslow Homer')
  })
})
