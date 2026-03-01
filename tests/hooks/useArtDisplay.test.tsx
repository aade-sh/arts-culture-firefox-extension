import { h } from 'preact'
import { fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { describe, expect, it, vi } from 'vitest'
import { useArtDisplay } from '../../src/hooks/useArtDisplay'

function HookHarness() {
  const state = useArtDisplay()

  return (
    <div>
      <button onClick={() => state.setTurnoverAlways(true)}>toggle</button>
      <div data-testid="turnover">{String(state.userSettings.TURNOVER_ALWAYS)}</div>
      <div data-testid="provider">{state.userSettings.ART_PROVIDER ?? ''}</div>
    </div>
  )
}

describe('useArtDisplay', () => {
  it('sends initializeArt message on mount', async () => {
    render(<HookHarness />)

    await waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'initializeArt',
      })
    })
  })

  it('sends setTurnoverAlways message with specific payload', async () => {
    render(<HookHarness />)

    fireEvent.click(screen.getByText('toggle'))

    await waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'setTurnoverAlways',
        turnoverAlwaysEnabled: true,
      })
    })
  })

  it('rolls back optimistic toggle when sendMessage fails', async () => {
    ;(chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
      async (msg: { type: string }) => {
        if (msg.type === 'setTurnoverAlways') {
          throw new Error('failed')
        }
      },
    )

    render(<HookHarness />)

    fireEvent.click(screen.getByText('toggle'))

    await waitFor(() => {
      expect(screen.getByTestId('turnover').textContent).toBe('undefined')
    })
  })

  it('applies settingsUpdated message to local state', async () => {
    render(<HookHarness />)

    const addListener = chrome.runtime.onMessage.addListener as ReturnType<
      typeof vi.fn
    >
    const listener = addListener.mock.calls[0][0]

    listener({
      type: 'settingsUpdated',
      userSettings: {
        ART_PROVIDER: 'met-museum',
        TURNOVER_ALWAYS: true,
      },
    })

    await waitFor(() => {
      expect(screen.getByTestId('turnover').textContent).toBe('true')
      expect(screen.getByTestId('provider').textContent).toBe('met-museum')
    })
  })
})
