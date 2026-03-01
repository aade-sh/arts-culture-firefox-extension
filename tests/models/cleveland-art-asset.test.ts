import { describe, expect, it } from 'vitest'
import { ClevelandArtAsset } from '../../src/models/cleveland-art-asset'

describe('ClevelandArtAsset', () => {
  it('extracts creator and attribution from api response', () => {
    const asset = ClevelandArtAsset.fromApiResponse({
      id: 94979,
      title: 'Nathaniel Hurd',
      creators: [
        {
          role: 'artist',
          description: 'John Singleton Copley (American, 1738–1815)',
        },
      ],
      tombstone: '1915.534',
      images: {
        web: { url: 'https://openaccess-cdn.clevelandart.org/1915.534/a.jpg' },
      },
      url: 'https://clevelandart.org/art/1915.534',
    })

    expect(asset.id).toBe('94979')
    expect(asset.creator).toContain('John Singleton Copley')
    expect(asset.attribution).toBe('1915.534')
    expect(asset.getProcessedImageUrl()).toContain('openaccess-cdn.clevelandart.org')
    expect(asset.getDetailsUrl()).toBe('https://clevelandart.org/art/1915.534')
    expect(asset.isValid()).toBe(true)
  })

  it('uses fallback creator when creators are missing', () => {
    const asset = ClevelandArtAsset.fromApiResponse({
      id: 1,
      title: 'Untitled',
      images: {
        web: { url: 'https://openaccess-cdn.clevelandart.org/x.jpg' },
      },
    })

    expect(asset.creator).toBe('Unknown Artist')
  })

  it('round-trips through json serialization', () => {
    const source = ClevelandArtAsset.fromApiResponse({
      id: 123,
      title: 'Work',
      creators: [{ description: 'Creator' }],
      tombstone: 'Attribution',
      images: {
        web: { url: 'https://openaccess-cdn.clevelandart.org/work.jpg' },
      },
      url: 'https://clevelandart.org/art/123',
    })

    const restored = ClevelandArtAsset.fromJSON(source.toJSON())

    expect(restored.id).toBe('123')
    expect(restored.title).toBe('Work')
    expect(restored.creator).toBe('Creator')
  })
})
