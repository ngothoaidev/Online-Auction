import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeedbackProvider } from '../../src/components/ui/Feedback.jsx'
import ChangePasswordModal from '../../src/components/ChangePasswordModal.jsx'
import ImageUploadModal from '../../src/components/ImageUploadModal.jsx'
import CategoryList from '../../src/pages/AdminDashboard/CategoryList.jsx'

afterEach(() => vi.unstubAllGlobals())

// Every overlay must be a real modal: named dialog, focus moves in, Escape closes, focus returns to the opener.
describe('overlays use the shared Dialog', () => {
  it('change password: named dialog, focus inside, Escape closes', async () => {
    const onClose = vi.fn()
    render(<ChangePasswordModal isOpen onClose={onClose} />)
    const dialog = screen.getByRole('dialog', { name: 'Change password' })
    expect(dialog.contains(document.activeElement)).toBe(true)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('image upload: first focus is the visible "Choose an image" button, not the hidden file input', () => {
    render(<ImageUploadModal isOpen onClose={() => {}} onUpload={async () => {}} />)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /choose an image/i }))
  })

  it('admin add category: dialog with a labelled field, Escape closes and focus returns to the opener', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })))
    render(<FeedbackProvider><CategoryList /></FeedbackProvider>)
    const opener = screen.getByRole('button', { name: /add category/i })
    await userEvent.click(opener)

    const dialog = screen.getByRole('dialog', { name: 'Add new category' })
    expect(document.activeElement).toBe(screen.getByLabelText(/category name/i))
    expect(dialog.contains(document.activeElement)).toBe(true)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })
})
