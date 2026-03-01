import { cleanup } from '@testing-library/preact'
import { afterEach, beforeEach, vi } from 'vitest'
import { createChromeMock } from './utils/chrome'

const imageCaches = new Map<string, Map<string, Response>>()

function resetCacheStore() {
  imageCaches.clear()
}

vi.stubGlobal('caches', {
  open: vi.fn(async (name: string) => {
    const bucket = imageCaches.get(name) ?? new Map<string, Response>()
    imageCaches.set(name, bucket)

    return {
      match: vi.fn(async (url: string) => bucket.get(url)),
      put: vi.fn(async (url: string, response: Response) => {
        bucket.set(url, response)
      }),
    }
  }),
  delete: vi.fn(async (name: string) => {
    return imageCaches.delete(name)
  }),
})

vi.stubGlobal('chrome', createChromeMock())

if (typeof URL.createObjectURL !== 'function') {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:mock-object-url'),
  })
} else {
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:mock-object-url')
}

beforeEach(() => {
  resetCacheStore()
  vi.clearAllMocks()
  vi.stubGlobal('chrome', createChromeMock())
})

afterEach(() => {
  cleanup()
})
