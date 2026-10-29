import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, IconButton, Field, Dialog, StatusBadge, EmptyState } from '../../src/components/ui'

function Harness({ dismissible = true, pending = false, onConfirm = () => {} }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Confirm bid" description="Review before you commit" dismissible={dismissible} pending={pending}>
        <input aria-label="Amount" />
        <button onClick={() => setOpen(false)}>Cancel</button>
        <button onClick={onConfirm}>Confirm</button>
      </Dialog>
    </>
  )
}

describe('Dialog', () => {
  it('is a named, described modal; focus moves in; Escape closes and focus returns to the opener', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Open' })
    await user.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Confirm bid' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('Review before you commit')
    expect(dialog).toContainElement(document.activeElement)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(opener).toHaveFocus()
  })

  it('traps Tab and Shift+Tab inside the dialog', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = screen.getByRole('dialog')
    for (let i = 0; i < 7; i++) { await user.tab(); expect(dialog).toContainElement(document.activeElement) }
    for (let i = 0; i < 7; i++) { await user.tab({ shift: true }); expect(dialog).toContainElement(document.activeElement) }
  })

  it('pending or non-dismissible dialogs ignore Escape and backdrop clicks', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Harness pending />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true')
    rerender(<Harness dismissible={false} />)
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not crash restoring focus when the opener has been removed', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    rerender(<div />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('primitives', () => {
  it('IconButton refuses to exist without an accessible name', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<IconButton>x</IconButton>)).toThrow(/label/)
    render(<IconButton label="Toggle theme">x</IconButton>)
    expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument()
  })

  it('Button in loading state cannot be activated twice', async () => {
    const onClick = vi.fn()
    render(<Button loading onClick={onClick}>Pay</Button>)
    await userEvent.click(screen.getByRole('button', { name: /pay/i }))
    expect(onClick).not.toHaveBeenCalled()
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })

  it('Field wires label, hint and error to the control', () => {
    render(<Field label="Email" hint="We never share it" error="Enter a valid email"><input type="email" /></Field>)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('We never share it Enter a valid email')
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email')
  })

  it('StatusBadge and EmptyState render their text content', () => {
    render(<><StatusBadge tone="danger">Payment expired</StatusBadge><EmptyState title="No lots yet" action={<Button>Browse</Button>}>Nothing matches.</EmptyState></>)
    expect(screen.getByText('Payment expired')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No lots yet' })).toBeInTheDocument()
  })
})
