import { vi } from 'vitest'

export interface ChromeMock {
  runtime: {
    onInstalled: { addListener: ReturnType<typeof vi.fn> }
    onMessage: {
      addListener: ReturnType<typeof vi.fn>
      removeListener: ReturnType<typeof vi.fn>
    }
    sendMessage: ReturnType<typeof vi.fn>
  }
  tabs: {
    query: ReturnType<typeof vi.fn>
    sendMessage: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  storage: {
    local: {
      set: ReturnType<typeof vi.fn>
      get: ReturnType<typeof vi.fn>
      remove: ReturnType<typeof vi.fn>
      clear: ReturnType<typeof vi.fn>
    }
  }
}

export function createChromeMock(): ChromeMock {
  return {
    runtime: {
      onInstalled: {
        addListener: vi.fn(),
      },
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
      sendMessage: vi.fn().mockResolvedValue(undefined),
    },
    tabs: {
      query: vi.fn((_query: unknown, callback: (tabs: chrome.tabs.Tab[]) => void) =>
        callback([]),
      ),
      sendMessage: vi.fn(),
      create: vi.fn(),
    },
    storage: {
      local: {
        set: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue({}),
        remove: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
      },
    },
  }
}

export async function flushPromises(cycles = 2): Promise<void> {
  for (let i = 0; i < cycles; i++) {
    await Promise.resolve()
  }
}
