import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RijksmuseumProvider } from '../../../src/background/providers/rijksmuseum-provider'
import { CacheManager } from '../../../src/background/cache-manager'

describe('RijksmuseumProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('uses cached record ids when available', async () => {
    const cache = new CacheManager()
    vi.spyOn(cache, 'getCachedData').mockResolvedValue(['200105887'])

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const provider = new RijksmuseumProvider(cache)
    const success = await provider.syncData()

    expect(success).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(await provider.syncedAssetCount()).toBe(1)
  })

  it('syncs ids from search endpoint when cache is empty', async () => {
    const cache = new CacheManager()
    vi.spyOn(cache, 'getCachedData').mockResolvedValue(null)
    const setCachedData = vi.spyOn(cache, 'setCachedData').mockResolvedValue(undefined)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          orderedItems: [{ id: 'https://id.rijksmuseum.nl/200100988' }],
        }),
        { status: 200 },
      ),
    )

    const provider = new RijksmuseumProvider(cache)
    const success = await provider.syncData()

    expect(success).toBe(true)
    expect(await provider.syncedAssetCount()).toBe(1)
    expect(setCachedData).toHaveBeenCalledWith('rijksmuseum', 'ids', [
      '200100988',
    ])
  })

  it('loads asset details through linked-data chain', async () => {
    const cache = new CacheManager()
    vi.spyOn(cache, 'getCachedData').mockResolvedValue(['200100988'])

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = input.toString()

      if (url === 'https://data.rijksmuseum.nl/200100988') {
        return new Response(
          JSON.stringify({
            identified_by: [
              { type: 'Name', content: 'Cat at Play' },
              { type: 'Identifier', content: 'SK-A-3089' },
            ],
            produced_by: {
              referred_to_by: [{ content: 'Jan Toorop' }],
              timespan: { identified_by: [{ type: 'Name', content: '1899' }] },
            },
            shows: [{ id: 'https://id.rijksmuseum.nl/202100988' }],
          }),
          { status: 200 },
        )
      }

      if (url === 'https://data.rijksmuseum.nl/202100988') {
        return new Response(
          JSON.stringify({
            digitally_shown_by: [
              { id: 'https://id.rijksmuseum.nl/5008910398567010810098' },
            ],
          }),
          { status: 200 },
        )
      }

      if (url === 'https://data.rijksmuseum.nl/5008910398567010810098') {
        return new Response(
          JSON.stringify({
            access_point: [{ id: 'https://iiif.micr.io/mPymb/full/max/0/default.jpg' }],
          }),
          { status: 200 },
        )
      }

      return new Response('{}', { status: 404 })
    })

    const provider = new RijksmuseumProvider(cache)
    await provider.syncData()

    const asset = await provider.getAsset(0)
    expect(asset?.title).toBe('Cat at Play')
    expect(asset?.creator).toBe('Jan Toorop')
    expect(asset?.remoteImageUrl).toContain('iiif.micr.io')
    expect(asset?.getDetailsUrl()).toContain('/collection/SK-A-3089')
  })
})
