import { it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import RichTextEditor from '../../src/components/RichTextEditor';
it('synchronizes externally applied AI content and undo without emitting a user edit', async () => {
  const changes: string[] = [];
  const onChange = (value: string) => { changes.push(value); };
  const { rerender } = render(<RichTextEditor value="<p>Original</p>" onChange={onChange} label="Listing description" />);
  rerender(<RichTextEditor value="<p>AI draft</p>" onChange={onChange} label="Listing description" />);
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Listing description' })).toHaveTextContent('AI draft'));
  rerender(<RichTextEditor value="<p>Original</p>" onChange={onChange} label="Listing description" />);
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Listing description' })).toHaveTextContent('Original'));
  expect(changes).toEqual([]);
});
