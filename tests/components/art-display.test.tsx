import { h } from 'preact'
import { fireEvent, render, screen } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import { ArtDisplay } from '../../src/components/ArtDisplay'

const mockAsset = {
  id: '1',
  title: 'Art',
  creator: 'Artist',
  attribution: '',
  remoteImageUrl: 'https://img.example/1',
  detailsUrl: 'detail-1',
  provider: 'google-arts',
  isImageCached: vi.fn(),
  getDisplayImageUrl: vi.fn(),
  getProcessedImageUrl: vi.fn(),
  getDetailsUrl: vi.fn(),
  toJSON: vi.fn(),
  isValid: vi.fn(),
}

describe('ArtDisplay', () => {
  it('triggers rotate on ArrowRight key', () => {
    const onRotate = vi.fn()

    render(
      <ArtDisplay
        asset={mockAsset as any}
        imageUrl={'data:image/mock'}
        onRotate={onRotate}
        onInfo={vi.fn()}
        onSettings={vi.fn()}
      />,
    )

    fireEvent.keyDown(screen.getByRole('img').closest('#main-content')!, {
      key: 'ArrowRight',
    })

    expect(onRotate).toHaveBeenCalled()
  })

  it('disables rotate button while loading', () => {
    render(
      <ArtDisplay
        asset={mockAsset as any}
        imageUrl={'data:image/mock'}
        loading={true}
        onRotate={vi.fn()}
        onInfo={vi.fn()}
        onSettings={vi.fn()}
      />,
    )

    expect(
      (screen.getByTitle('Next artwork') as HTMLButtonElement).disabled,
    ).toBe(true)
  })
})
