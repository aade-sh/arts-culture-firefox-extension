import { describe, expect, it, vi } from 'vitest'
import { GoogleArtsAsset } from '../../src/models/google-arts-asset'

describe('GoogleArtsAsset', () => {
  it('builds processed image and details urls', () => {
    const asset = GoogleArtsAsset.fromApiResponse({
      id: '1',
      title: 'Starry Night',
      creator: 'Van Gogh',
      attribution: '1889',
      image: 'https://images.example/artwork',
      link: 'abc123',
    })

    expect(asset.getProcessedImageUrl()).toBe(
      'https://images.example/artwork=s1920-rw',
    )
    expect(asset.getDetailsUrl()).toBe(
      'https://artsandculture.google.com/asset/abc123',
    )
    expect(asset.isValid()).toBe(true)
  })

  it('round-trips through json serialization', () => {
    const source = GoogleArtsAsset.fromApiResponse({
      id: 'g1',
      title: 'Mona Lisa',
      creator: 'Da Vinci',
      attribution: 'Louvre',
      image: 'https://images.example/mona',
      link: 'mona-id',
    })

    const serialized = source.toJSON()
    const restored = GoogleArtsAsset.fromJSON(serialized)

    expect(restored.id).toBe('g1')
    expect(restored.title).toBe('Mona Lisa')
    expect(restored.creator).toBe('Da Vinci')
    expect(restored.attribution).toBe('Louvre')
    expect(restored.remoteImageUrl).toBe('https://images.example/mona')
    expect(restored.detailsUrl).toBe('mona-id')
  })

  it('returns processed image url when image is not cached', async () => {
    const asset = GoogleArtsAsset.fromApiResponse({
      title: 'Untitled',
      image: 'https://images.example/not-cached',
    })

    const url = await asset.getDisplayImageUrl()
    expect(url).toBe('https://images.example/not-cached=s1920-rw')
  })

  it('returns object url when cached image exists', async () => {
    const asset = GoogleArtsAsset.fromApiResponse({
      title: 'Untitled',
      image: 'https://images.example/cached',
    })

    const processed = asset.getProcessedImageUrl()
    const cache = await caches.open('google-arts-images')
    await cache.put(processed, new Response(new Blob(['img'])))

    const spy = vi.spyOn(URL, 'createObjectURL')
    const url = await asset.getDisplayImageUrl()

    expect(spy).toHaveBeenCalled()
    expect(url).toBe('blob:mock-object-url')
  })
})
