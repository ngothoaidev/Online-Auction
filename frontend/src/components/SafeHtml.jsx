import DOMPurify from 'dompurify';

// Defence in depth: the API already sanitizes rich text, the client sanitizes again before it touches the DOM.
export const sanitizeHtml = (html) => DOMPurify.sanitize(html ?? '', { USE_PROFILES: { html: true }, FORBID_ATTR: ['style'] });

export default function SafeHtml({ html, ...props }) {
  return <div {...props} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}
