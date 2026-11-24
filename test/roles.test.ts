import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), 'lib', file), 'utf-8')

const declared = (css: string) =>
  new Set([...css.matchAll(/(--[\w-]+):/g)].map((match) => match[1]))

const css = read('roles.css')
const [themeBlock, scopes] = css.split('@layer theme')
const brandBlock = scopes.slice(0, scopes.indexOf('[data-color-accent='))

const accent = (name: string) => {
  const start = css.indexOf(`[data-color-accent='${name}'] {`)
  expect(start, `${name} missing`).toBeGreaterThan(-1)
  return css.slice(start, css.indexOf('}', start))
}

describe('Role tokens', () => {
  it('names each role by the property it is for', () => {
    expect(themeBlock).toContain('--background-color-surface: var(--color-white);')
    expect(themeBlock).toContain('--text-color-default: var(--color-grey-1000);')
    expect(themeBlock).toContain('--border-color-control: var(--color-grey-700);')
    expect(themeBlock).toContain('--outline-color-focus: var(--color-primary-800);')
    expect(themeBlock).toContain('--background-color-danger-solid: var(--color-danger);')
  })

  it('only points at colours that every brand defines', () => {
    const base = declared(read('theme-base.css'))
    const used = [...css.matchAll(/var\((--[\w-]+)\)/g)].map((match) => match[1])

    for (const brand of ['atom', 'atom-school', 'quest']) {
      const available = new Set([...base, ...declared(read(`theme-${brand}.css`))])
      const missing = used.filter((name) => !available.has(name))

      expect(missing, `missing in ${brand}`).toEqual([])
    }
  })

  it('re-declares the roles a brand changes inside every brand scope', () => {
    expect(brandBlock).toContain("[data-brand],\n  .theme-atom,")
    expect(brandBlock).toContain('.theme-quest-reports')
    expect(brandBlock).toContain('--background-color-accent-solid: var(--color-primary-800);')
    expect(brandBlock).toContain('--background-color-page: var(--color-background);')
    expect(brandBlock).not.toContain('--text-color-default')
    expect(brandBlock).not.toContain('--background-color-danger-solid')
  })
})

describe('Accent scopes', () => {
  it('points the accent roles at a hue', () => {
    expect(accent('pink')).toContain('--background-color-accent-solid: var(--color-pink-800);')
    expect(accent('pink')).toContain('--background-color-accent-subtle: var(--color-pink-100);')
    expect(accent('pink')).toContain('--text-color-on-accent-subtle: var(--color-pink-1000);')
    expect(accent('pink')).toContain('--border-color-accent: var(--color-pink-300);')
  })

  it('uses the status tokens for a tone and borrows the steps they lack', () => {
    expect(accent('danger')).toContain('--background-color-accent-solid: var(--color-danger);')
    expect(accent('danger')).toContain('--background-color-accent-solid-hover: var(--color-danger-mid);')
    expect(accent('danger')).toContain('--background-color-accent-subtle: var(--color-danger-light);')
    expect(accent('danger')).toContain('--background-color-accent-subtle-hover: var(--color-red-200);')
  })

  it('keeps warning text readable on its fills', () => {
    expect(accent('warning')).toContain('--text-color-on-accent: var(--color-grey-800);')
    expect(accent('warning')).toContain('--text-color-accent: var(--color-warning-text);')
  })

  it.each(['orange', 'lime'])('puts the darkest grey on a %s fill', (hue) => {
    expect(accent(hue)).toContain('--text-color-on-accent: var(--color-grey-1200);')
    expect(accent(hue)).toContain('--text-color-on-accent-emphasis: var(--color-grey-1200);')
  })

  it('keeps white text where the fill is dark enough for it', () => {
    expect(accent('yellow')).toContain('--text-color-on-accent: var(--color-white);')
    expect(accent('pink')).toContain('--text-color-on-accent: var(--color-white);')
  })

  it('reaches 4.5:1 for text on every hue\'s solid fill', async () => {
    const { getContrast } = await import('color2k')
    const { hues } = await import(path.join(process.cwd(), 'lib', 'roles.js'))
    const colors = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'src', 'properties', 'colors.json'), 'utf-8')
    ).color

    for (const hue of hues) {
      const ink = accent(hue).includes('--text-color-on-accent: var(--color-grey-1200)')
        ? colors.grey['1200'].$value
        : '#fff'

      expect(getContrast(ink, colors[hue]['800'].$value), hue).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('returns to the brand colour', () => {
    expect(accent('brand')).toContain('--background-color-accent-solid: var(--color-primary-800);')
  })

  it('leaves links, focus and neutral roles alone', () => {
    for (const name of ['pink', 'danger', 'brand']) {
      expect(accent(name)).not.toMatch(/link|focus|surface|text-color-default/)
    }
  })

  it('comes after the brand scopes so it wins on the same element', () => {
    expect(css.indexOf("[data-color-accent='brand']")).toBeGreaterThan(css.indexOf('.theme-quest-reports'))
  })
})

describe('Names for consumers', () => {
  it('lists the brands, accents and roles the CSS defines', async () => {
    const names = await import(path.join(process.cwd(), 'lib', 'roles.js'))

    expect(names.brands).toEqual(['atom', 'school', 'quest'])
    expect(names.tones).toEqual(['success', 'warning', 'danger', 'info'])
    expect(names.accents).toHaveLength(21)
    for (const name of names.accents) accent(name)
    for (const role of names.roles.border) {
      expect(css).toContain(`--border-color-${role}:`)
    }
  })

  it('types them as unions', () => {
    const types = read('roles.d.ts')

    expect(types).toContain("export type Brand = 'atom' | 'school' | 'quest'")
    expect(types).toContain("export type ColorTone = 'success' | 'warning' | 'danger' | 'info'")
    expect(types).toContain("export type ColorAccent = 'brand' | ColorHue | ColorTone")
    expect(types).toMatch(/BorderColorRole = .*'control' \| 'control-subtle'/)
  })
})

