import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

// Reads the real stylesheet so the palette cannot drift below WCAG AA unnoticed.
const css = fs.readFileSync('src/styles/main.css', 'utf8')
const block = (selector) => {
  const start = css.indexOf(`${selector} {`)
  return css.slice(start, css.indexOf('\n}', start))
}
const tokens = (selector, base: Record<string, string> = {}) => {
  const out: Record<string, string> = { ...base }
  for (const m of block(selector).matchAll(/--([a-z-]+):\s*(#[0-9A-Fa-f]{6})\b/g)) out[m[1]] = m[2]
  return out
}
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

const light = tokens(':root')
const dark = tokens(':root.dark', light)

describe.each([['light', light], ['dark', dark]])('%s palette meets WCAG AA', (_name, t) => {
  const text = [['ink', 'canvas'], ['ink', 'surface'], ['muted', 'canvas'], ['muted', 'surface'], ['text-subtle', 'canvas'], ['brand', 'canvas'], ['brand', 'surface'],
    ['success', 'canvas'], ['danger', 'canvas'], ['warning', 'canvas'], ['on-ink', 'ink'], ['brand-strong', 'brand-soft'], ['success', 'success-soft'], ['danger', 'danger-soft'], ['warning', 'warning-soft'],
    ['on-ink', 'brand']] // text on brand-filled buttons/badges
  it.each(text)('%s on %s >= 4.5:1', (fg, bg) => {
    expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5)
  })
  it('focus ring and control borders are >= 3:1 against the page', () => {
    expect(ratio(t.focus, t.canvas)).toBeGreaterThanOrEqual(3)
    expect(ratio(t['input-border'], t.surface)).toBeGreaterThanOrEqual(3)
  })
})
