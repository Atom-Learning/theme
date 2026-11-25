import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), 'lib', file), 'utf-8')

const block = (css: string, selector: string) => {
  const start = css.indexOf(`${selector} {`)
  expect(start, `${selector} missing`).toBeGreaterThan(-1)
  return css.slice(start, css.indexOf('}', start))
}

describe('Brand scopes', () => {
  const css = read('themes.css')

  it.each([
    ['atom', 'atom', "'National 2 Condensed'"],
    ['school', 'atom-school', "'Inter'"],
    ['quest', 'quest', "'DM Sans'"]
  ])('selects %s by data-brand and by its class', (brand, theme, font) => {
    const selector = `[data-brand='${brand}'],\n  .theme-${theme}`

    expect(block(css, selector)).toContain(`--font-display: ${font}`)
    expect(block(css, selector)).toContain('--color-primary-800:')
  })

  it('leaves the reports classes without a data-brand', () => {
    expect(css).toContain('\n  .theme-quest-reports {')
    expect(css).toContain('\n  .theme-atom-school-reports {')
    expect(css.match(/\[data-brand=/g)).toHaveLength(3)
  })
})

describe('Reports type scale', () => {
  it('sets only the text sizes, on :root', () => {
    const names = [...block(read('reports.css'), ':root').matchAll(/(--[\w-]+):/g)].map(
      (match) => match[1]
    )

    expect(names.length).toBeGreaterThan(0)
    expect(names.every((name) => name.startsWith('--text-'))).toBe(true)
  })

  it('is the same scale for every brand that has one', () => {
    const scale = (theme: string) =>
      fs.readFileSync(
        path.join(process.cwd(), 'src', 'themes', theme, 'reports', 'sizes.json'),
        'utf-8'
      )

    expect(scale('atom-school')).toBe(scale('quest'))
  })
})
