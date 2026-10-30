import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AppErrorBoundary from '../../src/components/AppErrorBoundary'

describe('AppErrorBoundary', () => {
  it('shows a recoverable message instead of a blank page when a render throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}) // React logs the caught error
    const Broken = () => { throw new Error('boom') }
    render(<AppErrorBoundary><Broken /></AppErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })
})
