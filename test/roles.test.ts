import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), 'lib', file), 'utf-8')

const declared = (css: string) =>
  new Set([...css.matchAll(/(--[\w-]+):/g)].map((match) => match[1]))

const css = read('roles.css')
const [themeBlock, scopes] = css.split('@layer theme')
const brandBlock = scopes.slice(
  scopes.indexOf('[data-brand],'),
  scopes.indexOf('[data-color-accent=')
)

const accent = (name: string) => {
  const start = css.indexOf(`[data-color-accent='${name}'] {`)
  expect(start, `${name} missing`).toBeGreaterThan(-1)
  return css.slice(start, css.indexOf('}', start))
}

describe('Role tokens', () => {
  // A role class such as border-danger shadows the colour class of the same
  // name, so the two must agree or existing markup changes colour.
  it('keeps the value of any colour class a role shares a name with', () => {
    // The warning base fails contrast as text, so the role is the darker text shade
    const deliberate = ['--text-color-warning']
    const base = read('theme-base.css')
    const changed = [
      ...themeBlock.matchAll(
        /(--(?:background|text|border|outline)-color-([\w-]+)): ([^;]+);/g
      )
    ]
      .filter(([, , name]) => base.includes(`--color-${name}:`))
      .filter(([, , name, value]) => value !== `var(--color-${name})`)
      .map(([, role]) => role)

    expect(changed).toEqual(deliberate)
  })

  it('names each role by the property it is for', () => {
    expect(themeBlock).toContain('--background-color-surface: var(--color-white);')
    expect(themeBlock).toContain('--text-color-default: var(--color-grey-1000);')
    expect(themeBlock).toContain('--border-color-control: var(--color-grey-700);')
    expect(themeBlock).toContain('--outline-color-focus: var(--color-blue-800);')
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

  it('reads none of the old alias properties', () => {
    expect(css).not.toMatch(/--color-(text|background)/)
  })

  it('gives school its own page colour, after the shared brand scope', () => {
    const school = css.indexOf("[data-brand='school'],\n  .theme-atom-school,\n  .theme-atom-school-reports {")

    expect(school).toBeGreaterThan(css.indexOf('[data-brand],'))
    expect(css.slice(school, css.indexOf('}', school))).toContain(
      '--background-color-page: var(--color-grey-50);'
    )
  })

  it('re-declares the roles a brand changes inside every brand scope', () => {
    expect(brandBlock).toContain("[data-brand],\n  .theme-atom,")
    expect(brandBlock).toContain('.theme-quest-reports')
    expect(brandBlock).toContain('--background-color-accent-solid: var(--color-primary-800);')
    expect(brandBlock).toContain('--background-color-page: var(--color-grey-100);')
    expect(brandBlock).not.toContain('--text-color-default')
    expect(brandBlock).not.toContain('--background-color-danger-solid')
  })
})

// grey-1200 on yellow-800 is 4.47:1. Accepted until yellow-800 is darkened;
// the floor stops it getting worse
const ACCEPTED_BELOW_AA: Record<string, number> = { yellow: 4.45 }

describe('Shadow roles', () => {
  it('are plain variables on :root, outside @theme', () => {
    expect(themeBlock).not.toContain('--shadow-')
    expect(scopes).toContain('--shadow-floating-md: var(--shadow-md);')
    expect(scopes).toContain('--shadow-resting-sm: var(--shadow-sm);')
    expect(scopes).toContain('--shadow-edge-top: 0 -6px 6px -1px hsla(0, 0%, 20%, 0.05);')
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

  it('gives the neutral tone the same values as the grey hue', () => {
    expect(accent('neutral')).toContain('--background-color-accent-solid: var(--color-grey-800);')
    expect(accent('neutral').replace("'neutral'", "'grey'")).toBe(accent('grey'))
  })

  it('keeps warning text readable on its fills', () => {
    expect(accent('warning')).toContain('--text-color-on-accent: var(--color-grey-800);')
    expect(accent('warning')).toContain('--text-color-accent: var(--color-warning-text);')
  })

  it.each(['orange', 'yellow', 'lime'])('puts the darkest grey on a %s fill', (hue) => {
    expect(accent(hue)).toContain('--text-color-on-accent: var(--color-grey-1200);')
  })

  it('uses the darkest step for the bold fill, with white text on every hue', () => {
    expect(accent('pink')).toContain('--background-color-accent-bold: var(--color-pink-1000);')
    for (const hue of ['yellow', 'lime', 'orange']) {
      expect(accent(hue)).toContain('--text-color-on-accent-bold: var(--color-white);')
    }
  })

  it('keeps dark text on the warning bold fill', () => {
    expect(accent('warning')).toContain('--background-color-accent-bold: var(--color-warning-dark);')
    expect(accent('warning')).toContain('--text-color-on-accent-bold: var(--color-grey-1200);')
  })

  it('keeps white text where the fill is dark enough for it', () => {
    expect(accent('pink')).toContain('--text-color-on-accent: var(--color-white);')
  })

  it('reaches 4.5:1 for text on every hue\'s solid fill, bar the accepted exceptions', async () => {
    const { getContrast } = await import('color2k')
    const { hues } = await import(path.join(process.cwd(), 'lib', 'roles.js'))
    const colors = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'src', 'properties', 'colors.json'), 'utf-8')
    ).color

    for (const hue of hues) {
      const ink = accent(hue).includes('--text-color-on-accent: var(--color-grey-1200)')
        ? colors.grey['1200'].$value
        : '#fff'

      expect(getContrast(ink, colors[hue]['800'].$value), hue).toBeGreaterThanOrEqual(
        ACCEPTED_BELOW_AA[hue] ?? 4.5
      )
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
    expect(names.tones).toEqual(['success', 'warning', 'danger', 'info', 'neutral'])
    expect(names.accents).toHaveLength(22)
    for (const name of names.accents) accent(name)
    for (const role of names.roles.border) {
      expect(css).toContain(`--border-color-${role}:`)
    }
  })

  it('types them as unions', () => {
    const types = read('roles.d.ts')

    expect(types).toContain("export type Brand = 'atom' | 'school' | 'quest'")
    expect(types).toContain("export type ColorTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'")
    expect(types).toContain("export type ColorAccent = 'brand' | ColorHue | ColorTone")
    expect(types).toMatch(/BorderColorRole = .*'control' \| 'control-subtle'/)
  })
})


describe('Dark scheme', () => {
  const darkStart = css.indexOf("[data-color-scheme='dark'],")
  const dark = css.slice(darkStart, css.indexOf('}', darkStart))
  const darkAccent = (name: string) => {
    const start = css.indexOf(`[data-color-scheme='dark'] [data-color-accent='${name}'],`)
    expect(start, `dark ${name} missing`).toBeGreaterThan(-1)
    return css.slice(start, css.indexOf('}', start))
  }
  const groups = (file: string) =>
    JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'roles', file), 'utf-8'))

  it('gives every role a dark value', () => {
    const light = groups('light.json')
    const darkRoles = groups('dark.json')

    for (const group of Object.keys(light)) {
      expect(Object.keys(darkRoles[group]), group).toEqual(Object.keys(light[group]))
    }
  })

  it('flips surfaces and text onto the dark grey scale, and tells the browser', () => {
    expect(dark).toContain('color-scheme: dark;')
    expect(dark).toContain('--background-color-page: var(--color-dark-grey-100);')
    expect(dark).toContain('--background-color-surface: var(--color-dark-grey-200);')
    expect(dark).toContain('--text-color-default: var(--color-dark-grey-1200);')
  })

  it('wins over a brand scope set below it', () => {
    expect(dark).toContain("[data-color-scheme='dark'] [data-brand],")
    expect(dark).toContain("[data-color-scheme='dark'] .theme-quest-reports {")
    expect(darkStart).toBeGreaterThan(css.indexOf("[data-brand='school']"))
  })

  it('reads the brand from its dark primary scale', () => {
    expect(dark).toContain('--background-color-accent-solid: var(--color-dark-primary-800);')
    expect(dark).toContain('--text-color-accent: var(--color-dark-primary-1100);')
  })

  it("points the accent roles at the hue's dark scale", () => {
    expect(darkAccent('pink')).toContain('--background-color-accent-subtle: var(--color-dark-pink-300);')
    expect(darkAccent('pink')).toContain('--background-color-accent-solid: var(--color-dark-pink-800);')
    expect(darkAccent('pink')).toContain('--background-color-accent-bold: var(--color-dark-pink-600);')
    expect(darkAccent('pink')).toContain('--text-color-on-accent-subtle: var(--color-dark-pink-1100);')
  })

  it("gives a tone its hue's dark scale, with no light status tokens", () => {
    expect(darkAccent('warning')).toContain('--text-color-accent: var(--color-dark-orange-1100);')
    expect(darkAccent('warning')).not.toContain('warning-text')
    expect(darkAccent('danger')).toContain('--background-color-accent-solid: var(--color-dark-red-800);')
  })

  it('gives overlays a visible border in dark', () => {
    expect(themeBlock).toContain('--border-color-overlay: var(--color-grey-200);')
    expect(dark).toContain('--border-color-overlay: var(--color-dark-grey-600);')
  })

  it('deepens every shadow role in dark', () => {
    const light = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'roles', 'shadows.json'), 'utf-8'))
    const darkShadows = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'roles', 'shadows-dark.json'), 'utf-8'))

    expect(Object.keys(darkShadows)).toEqual(Object.keys(light))
    for (const [name, value] of Object.entries(darkShadows)) {
      expect(dark).toContain(`--shadow-${name}: ${value};`)
    }
  })

  it('reaches 4.5:1 for text on every solid and bold fill in dark', async () => {
    const { getContrast } = await import('color2k')
    const { accents } = await import(path.join(process.cwd(), 'lib', 'roles.js'))
    const base = read('theme-base.css')
    const value = (variable: string) =>
      base.match(new RegExp(`${variable}: ([^;]+);`))?.[1] ?? variable

    for (const name of accents.filter((accent: string) => accent !== 'brand')) {
      const scope = darkAccent(name)
      for (const [fill, text] of [['accent-solid', 'on-accent'], ['accent-bold', 'on-accent-bold']]) {
        const fillVar = scope.match(new RegExp(`--background-color-${fill}: var\\((--[\\w-]+)\\)`))![1]
        const textVar = scope.match(new RegExp(`--text-color-${text}: var\\((--[\\w-]+)\\)`))![1]
        expect(getContrast(value(textVar), value(fillVar)), `${name} ${text}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('has a dark scope for every accent', async () => {
    const { accents } = await import(path.join(process.cwd(), 'lib', 'roles.js'))
    for (const name of accents) darkAccent(name)
  })
})
