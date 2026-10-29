import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const file = (p) => path.resolve(p); // vitest runs from frontend/

// index.html must carry real content before JavaScript runs (crawlers, agents, no-JS visitors).
const html = fs.readFileSync(file('index.html'), 'utf8');
const root = new DOMParser().parseFromString(html, 'text/html').getElementById('root');

describe('static index.html shell', () => {
  it('has at least 500 characters of text and exactly one h1', () => {
    expect(root.textContent.replace(/\s+/g, ' ').trim().length).toBeGreaterThanOrEqual(500);
    expect(root.querySelectorAll('h1')).toHaveLength(1);
  });

  it('keeps heading levels sequential', () => {
    const levels = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]));
    levels.forEach((level, i) => { if (i) expect(level - levels[i - 1]).toBeLessThanOrEqual(1); });
  });

  it('links only to routes and files the app serves', () => {
    const hrefs = [...root.querySelectorAll('a')].map((a) => a.getAttribute('href').split('?')[0]);
    const app = fs.readFileSync(file('src/App.jsx'), 'utf8');
    for (const href of hrefs) {
      expect(app.includes(`path="${href}"`) || fs.existsSync(file(`public${href}`)), href).toBe(true);
    }
  });
});
