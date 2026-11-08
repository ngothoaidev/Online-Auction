import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode, ComponentType } from 'react'

afterEach(() => cleanup())

// Every render gets its own QueryClient (no retries, no cache shared between tests), so components that read server
// state through TanStack Query render the same way they do in the app.
vi.mock('@testing-library/react', async (importOriginal) => {
  const rtl = await importOriginal<typeof import('@testing-library/react')>()
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')
  const render: typeof rtl.render = ((ui: ReactNode, options: { wrapper?: ComponentType<{ children: ReactNode }> } = {}) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const Inner = options.wrapper
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, Inner ? createElement(Inner, null, children) : children)
    return rtl.render(ui, { ...options, wrapper })
  }) as typeof rtl.render
  return { ...rtl, render }
})
