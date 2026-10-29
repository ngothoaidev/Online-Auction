import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import SafeHtml from '../../src/components/SafeHtml.jsx'

const MALICIOUS = [
  '<p>ok</p><script>window.__pwned = 1</script>',
  '<img src=x onerror="window.__pwned = 1">',
  '<a href="javascript:window.__pwned=1">click</a>',
  '<svg><script>window.__pwned=1</script></svg>',
  '<iframe src="https://evil.example"></iframe>',
  '<p style="background:url(javascript:1)" onclick="window.__pwned=1">x</p>',
]

describe('SafeHtml', () => {
  it.each(MALICIOUS)('strips active content from %s', (html) => {
    const { container } = render(<SafeHtml html={html} />)
    expect(container.querySelector('script, iframe, svg')).toBeNull()
    expect(container.innerHTML).not.toMatch(/onerror|onclick|javascript:/i)
    expect(window.__pwned).toBeUndefined()
  })

  it('keeps editor formatting', () => {
    const { container } = render(<SafeHtml html="<h2>Title</h2><p><strong>bold</strong> <em>it</em></p><ul><li>a</li></ul>" />)
    expect(container.querySelector('h2')?.textContent).toBe('Title')
    expect(container.querySelector('strong')?.textContent).toBe('bold')
    expect(container.querySelectorAll('li')).toHaveLength(1)
  })
})
