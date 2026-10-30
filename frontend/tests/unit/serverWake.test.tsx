import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import ServerWakeNotice from '../../src/components/ServerWakeNotice'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('ServerWakeNotice', () => {
  it('stays hidden when the API answers quickly', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })))
    render(<ServerWakeNotice />)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows while the API is asleep and hides once it answers', async () => {
    vi.useFakeTimers()
    let awake = false
    vi.stubGlobal('fetch', vi.fn(async () => { if (!awake) throw new TypeError('network'); return { ok: true } }))
    render(<ServerWakeNotice />)
    await act(async () => { await vi.advanceTimersByTimeAsync(3500) })
    expect(screen.getByRole('status')).toHaveTextContent(/waking up/i)
    awake = true
    await act(async () => { await vi.advanceTimersByTimeAsync(3500) })
    expect(screen.queryByRole('status')).toBeNull()
  })
})
