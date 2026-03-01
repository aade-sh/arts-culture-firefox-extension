import { h } from 'preact'
import { fireEvent, render, screen } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import { SettingsModal } from '../../src/components/SettingsModal'

describe('SettingsModal', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <SettingsModal
        isOpen={false}
        onClose={vi.fn()}
        userSettings={{}}
        onProviderChange={vi.fn()}
        onTurnoverAlwaysChange={vi.fn()}
      />,
    )

    expect(container.querySelector('#settings-modal')).toBeNull()
  })

  it('calls provider change callback with selected provider', async () => {
    const onProviderChange = vi.fn().mockResolvedValue(undefined)

    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        userSettings={{ ART_PROVIDER: 'google-arts' }}
        onProviderChange={onProviderChange}
        onTurnoverAlwaysChange={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Art Provider'), {
      currentTarget: { value: 'met-museum' },
      target: { value: 'met-museum' },
    })

    expect(onProviderChange).toHaveBeenCalledWith('met-museum')
  })

  it('calls turnover toggle callback with checked value', async () => {
    const onTurnoverAlwaysChange = vi.fn().mockResolvedValue(undefined)

    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        userSettings={{ TURNOVER_ALWAYS: false }}
        onProviderChange={vi.fn()}
        onTurnoverAlwaysChange={onTurnoverAlwaysChange}
      />,
    )

    fireEvent.click(screen.getByLabelText('Refresh artwork on every new tab'))

    expect(onTurnoverAlwaysChange).toHaveBeenCalledWith(true)
  })
})
