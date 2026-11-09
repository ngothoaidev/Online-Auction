import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
const generateDraft = vi.fn(), getCapabilities = vi.fn(), assistantEvent = vi.fn();
vi.mock('../../src/services/listingAssistant', async importOriginal => ({ ...(await importOriginal<typeof import('../../src/services/listingAssistant')>()), generateDraft, getCapabilities, assistantEvent }));
const { default: ListingAssistant } = await import('../../src/components/ListingAssistant');
const { plainTextHtml } = await import('../../src/services/listingAssistant');
const file = new File(['image'], 'item.png', { type: 'image/png' });
const photos = [{ file, preview: 'blob:test' }];
const draft = { requestId: 'id', inputHash: 'hash', draft: { title: 'Suggested watch', descriptionText: 'Seller reports scratches.', categoryId: 1 }, facts: [{ text: 'scratches', source: 'seller' }], questions: ['Box included?'], warnings: ['Verify details.'] };
function Harness() {
  const [values, setValues] = useState({ title: 'My title', description: '', categoryId: '' });
  return <><input aria-label="Manual title" value={values.title} onChange={e => setValues(v => ({ ...v, title: e.target.value }))} /><ListingAssistant photos={photos} values={values} onApply={(k, v) => setValues(s => ({ ...s, [k]: v }))} onDraftUsed={() => {}} /></>;
}
beforeEach(() => { vi.clearAllMocks(); getCapabilities.mockResolvedValue({ enabled: true, dailyRemaining: 5 }); generateDraft.mockResolvedValue(draft); });
describe('AI listing assistant', () => {
  it('names ShopAIKey in the consent before sending photos or notes', async () => {
    getCapabilities.mockResolvedValue({ enabled: true, dailyRemaining: 5, providerLabel: 'ShopAIKey' });
    render(<Harness />);
    expect(await screen.findByText(/Generate sends the selected photos and notes to ShopAIKey/)).toBeVisible();
    expect(generateDraft).not.toHaveBeenCalled();
  });
  it('does not call provider until Generate; reviews replacements and protects undo after manual edits', async () => {
    render(<Harness />);
    await screen.findByRole('button', { name: 'Generate draft' });
    expect(generateDraft).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Generate draft' }));
    await screen.findByText('Suggested watch');
    expect(screen.getByLabelText('Manual title')).toHaveValue('My title');
    await userEvent.click(screen.getByRole('button', { name: 'Apply title' }));
    await userEvent.click(screen.getByRole('button', { name: 'Replace content' }));
    expect(screen.getByLabelText('Manual title')).toHaveValue('Suggested watch');
    await userEvent.click(screen.getByRole('button', { name: 'Undo title' }));
    expect(screen.getByLabelText('Manual title')).toHaveValue('My title');
    await userEvent.click(screen.getByRole('button', { name: 'Apply title' }));
    await userEvent.click(screen.getByRole('button', { name: 'Replace content' }));
    await userEvent.type(screen.getByLabelText('Manual title'), ' edited');
    expect(screen.getByRole('button', { name: 'Undo title' })).toBeDisabled();
  });
  it('marks late results stale when notes change in flight', async () => {
    let resolve: (value: typeof draft) => void = () => {};
    generateDraft.mockImplementation(() => new Promise(r => { resolve = r; }));
    render(<Harness />);
    await userEvent.click(await screen.findByRole('button', { name: 'Generate draft' }));
    await userEvent.type(screen.getByLabelText('Seller notes'), 'changed');
    resolve(draft);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply title' })).toBeDisabled());
    expect(screen.getByLabelText('Manual title')).toHaveValue('My title');
  });
  it('keeps manual form when AI fails or is disabled', async () => {
    generateDraft.mockRejectedValue(new Error('AI unavailable'));
    render(<Harness />);
    await userEvent.click(await screen.findByRole('button', { name: 'Generate draft' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('AI unavailable');
    expect(screen.getByLabelText('Manual title')).toHaveValue('My title');
  });
  it('escapes model HTML rather than rendering it', () => {
    expect(plainTextHtml('<img src=x onerror=alert(1)>')).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>');
  });
});
