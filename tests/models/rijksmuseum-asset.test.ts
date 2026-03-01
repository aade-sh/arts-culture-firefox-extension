import { describe, expect, it } from 'vitest'
import { RijksmuseumAsset } from '../../src/models/rijksmuseum-asset'

describe('RijksmuseumAsset', () => {
  it('maps core fields and urls', () => {
    const asset = RijksmuseumAsset.fromApiResponse({
      id: '200105887',
      title: 'Cat at Play',
      creator: 'Unknown Artist',
      attribution: '1890',
      imageUrl: 'https://iiif.micr.io/example/full/max/0/default.jpg',
      detailsUrl: 'https://www.rijksmuseum.nl/en/collection/SK-A-3089',
    })

    expect(asset.id).toBe('200105887')
    expect(asset.title).toBe('Cat at Play')
    expect(asset.getProcessedImageUrl()).toContain('iiif.micr.io')
    expect(asset.getDetailsUrl()).toContain('/collection/SK-A-3089')
    expect(asset.isValid()).toBe(true)
  })

  it('round-trips through json serialization', () => {
    const source = RijksmuseumAsset.fromApiResponse({
      id: '200100988',
      title: 'Work',
      creator: 'Jan Toorop',
      attribution: '1899',
      imageUrl: 'https://iiif.micr.io/mPymb/full/max/0/default.jpg',
      detailsUrl: 'https://www.rijksmuseum.nl/en/collection/SK-A-1',
    })

    const restored = RijksmuseumAsset.fromJSON(source.toJSON())

    expect(restored.id).toBe('200100988')
    expect(restored.creator).toBe('Jan Toorop')
    expect(restored.remoteImageUrl).toContain('iiif.micr.io')
  })
})
