import { describe, expect, it } from 'vitest'
import { MetMuseumAsset } from '../../src/models/met-museum-asset'

describe('MetMuseumAsset', () => {
  it('extracts creator and attribution from api response', () => {
    const asset = MetMuseumAsset.fromApiResponse({
      objectID: 10,
      title: 'Irises',
      artistDisplayName: 'Vincent van Gogh',
      culture: 'Dutch',
      period: 'Post-Impressionism',
      primaryImage: 'https://images.metmuseum.org/irises.jpg',
      objectURL: 'https://www.metmuseum.org/art/collection/search/10',
      isPublicDomain: true,
    })

    expect(asset.id).toBe('10')
    expect(asset.creator).toBe('Vincent van Gogh')
    expect(asset.attribution).toBe('Dutch, Post-Impressionism')
    expect(asset.getProcessedImageUrl()).toBe(
      'https://images.metmuseum.org/irises.jpg',
    )
    expect(asset.getDetailsUrl()).toBe(
      'https://www.metmuseum.org/art/collection/search/10',
    )
    expect(asset.isValid()).toBe(true)
  })

  it('uses fallback artist from constituents and credit line attribution', () => {
    const asset = MetMuseumAsset.fromApiResponse({
      objectID: 11,
      title: 'Work',
      constituents: [{ name: 'Fallback Artist' }],
      creditLine: 'Gift of Someone',
      primaryImage: 'https://images.metmuseum.org/work.jpg',
      isPublicDomain: true,
    })

    expect(asset.creator).toBe('Fallback Artist')
    expect(asset.attribution).toBe('Gift of Someone')
  })

  it('round-trips through json serialization', () => {
    const source = MetMuseumAsset.fromApiResponse({
      objectID: 25,
      title: 'The Harvesters',
      artistDisplayName: 'Pieter Bruegel',
      primaryImage: 'https://images.metmuseum.org/harvesters.jpg',
      objectURL: 'https://www.metmuseum.org/art/collection/search/25',
      isPublicDomain: true,
    })

    const restored = MetMuseumAsset.fromJSON(source.toJSON() as any)

    expect(restored.id).toBe('25')
    expect(restored.title).toBe('The Harvesters')
    expect(restored.creator).toBe('Pieter Bruegel')
    expect(restored.remoteImageUrl).toBe(
      'https://images.metmuseum.org/harvesters.jpg',
    )
  })

  it('validates display eligibility correctly', () => {
    expect(
      MetMuseumAsset.isValidForDisplay({
        primaryImage: 'https://images.metmuseum.org/a.jpg',
        isPublicDomain: true,
      }),
    ).toBe(true)

    expect(
      MetMuseumAsset.isValidForDisplay({
        primaryImage: '',
        isPublicDomain: true,
      }),
    ).toBe(false)

    expect(
      MetMuseumAsset.isValidForDisplay({
        primaryImage: 'https://images.metmuseum.org/a.jpg',
        isPublicDomain: false,
      }),
    ).toBe(false)
  })
})
