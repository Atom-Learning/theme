import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { pascalCase } from 'pascal-case'

interface TokenGroup {
  [key: string]: TokenGroup | string | number | undefined
  $value?: string | number
  $type?: string
}

interface SourceToken {
  path: string[]
  value: string | number
}

const readJson = (file: string): TokenGroup =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), file), 'utf-8'))

const readOutput = (file: string): string =>
  fs.readFileSync(path.join(process.cwd(), 'lib', file), 'utf-8')

// Walk a DTCG token file into a flat list of {path, value}
const flatten = (group: TokenGroup, trail: string[] = []): SourceToken[] => {
  if (group.$value !== undefined) return [{ path: trail, value: group.$value }]
  return Object.entries(group)
    .filter(([key]) => !key.startsWith('$'))
    .flatMap(([key, child]) =>
      child && typeof child === 'object'
        ? flatten(child as TokenGroup, [...trail, key])
        : []
    )
}

const BASE_FILES = [
  'src/properties/colors.json',
  'src/properties/aliases.json',
  'src/properties/sizes.json',
  'src/properties/containers.json',
  'src/properties/fonts.json',
  'src/properties/effects.json'
]

const baseTokens = BASE_FILES.flatMap((file) => flatten(readJson(file)))

// Mirrors the naming contract in src/native.ts
const nativeName = ([, type, item, subitem]: string[]): string => {
  if (!item || item === 'base') return type
  const sub = subitem === 'base' ? '' : (subitem ?? '')
  return parseInt(item)
    ? `${type}${item}${sub}`
    : `${type}${pascalCase(item)}${pascalCase(sub)}`
}

const NATIVE_SIZE_TYPES = ['font', 'leading', 'radii', 'space']

const isNativeToken = ({ path: tokenPath }: SourceToken): boolean => {
  const [category, type] = tokenPath
  if (category === 'color') return true
  return category === 'size' && NATIVE_SIZE_TYPES.includes(type)
}

const swiftConstantNames = (source: string): string[] =>
  [...source.matchAll(/public static let (\w+)/g)].map((match) => match[1])

const kotlinConstantNames = (source: string): string[] =>
  [...source.matchAll(/\bval (\w+)/g)].map((match) => match[1])

describe('Output Completeness', () => {
  it('source token set is non-trivial (guards the reconciliation below)', () => {
    expect(baseTokens.length).toBeGreaterThan(200)
  })

  describe('Native outputs', () => {
    const expectedNames = baseTokens.filter(isNativeToken).map((token) => nativeName(token.path))

    it('swift should contain exactly the native-eligible base tokens', () => {
      const actual = swiftConstantNames(readOutput('theme-base.swift'))

      expect([...actual].sort()).toEqual([...expectedNames].sort())
    })

    it('kotlin should contain exactly the native-eligible base tokens', () => {
      const actual = kotlinConstantNames(readOutput('theme-base.kt'))

      expect([...actual].sort()).toEqual([...expectedNames].sort())
    })

    it('swift and kotlin should expose an identical constant surface', () => {
      const themes = ['base', 'atom', 'quest', 'quest-reports']

      themes.forEach((themeName) => {
        const swift = swiftConstantNames(readOutput(`theme-${themeName}.swift`)).sort()
        const kotlin = kotlinConstantNames(readOutput(`theme-${themeName}.kt`)).sort()

        expect(kotlin, `${themeName} native outputs should agree`).toEqual(swift)
      })
    })

    it('every excluded group should be absent from native output', () => {
      const swift = readOutput('theme-base.swift')
      const kotlin = readOutput('theme-base.kt')
      const excluded = baseTokens.filter((token) => !isNativeToken(token))

      // font.families, size.breakpoint, size.size and effects.shadows
      expect(excluded.length).toBeGreaterThan(0)
      excluded.forEach((token) => {
        const name = nativeName(token.path)
        expect(swiftConstantNames(swift)).not.toContain(name)
        expect(kotlinConstantNames(kotlin)).not.toContain(name)
      })
    })
  })

  describe('Web outputs', () => {
    it('js properties should cover every base token except size.size and ratios', async () => {
      const { properties } = (await import(
        path.join(process.cwd(), 'lib', 'theme-base.js')
      )) as { properties: Record<string, string> }

      const expected = baseTokens.filter(
        ({ path: p }) =>
          !(p[0] === 'size' && p[1] === 'size') && p[0] !== 'ratios'
      )

      expect(Object.keys(properties)).toHaveLength(expected.length)
    })

    it('css should declare a custom property for every js property', async () => {
      const { properties } = (await import(
        path.join(process.cwd(), 'lib', 'theme-base.js')
      )) as { properties: Record<string, string> }
      const css = readOutput('theme-base.css')

      Object.keys(properties)
        // coolGrey is excluded here only because of a known naming mismatch,
        // covered by the dedicated test below
        .filter((name) => !name.includes('cool-grey'))
        .forEach((name) => {
          expect(css, `${name} missing from theme-base.css`).toContain(`${name}:`)
        })
    })

    // Pre-existing bug (predates the native outputs work): the CSS formatters
    // build names from `property.name`, which keeps camelCase for the only
    // camelCase scale, emitting `--color-coolGrey-100`, while the JS/d.ts
    // `properties` map kebab-cases it to `--color-cool-grey-100`. So
    // `var(--color-cool-grey-100)` resolves to nothing in CSS.
    // Delete the `.fails` once the naming is reconciled.
    it.fails('css and js should agree on coolGrey custom property names', async () => {
      const { properties } = (await import(
        path.join(process.cwd(), 'lib', 'theme-base.js')
      )) as { properties: Record<string, string> }
      const css = readOutput('theme-base.css')

      Object.keys(properties)
        .filter((name) => name.includes('cool-grey'))
        .forEach((name) => {
          expect(css, `${name} missing from theme-base.css`).toContain(`${name}:`)
        })
    })

    it('d.ts should declare every js theme key and property', async () => {
      const { theme, properties } = (await import(
        path.join(process.cwd(), 'lib', 'theme-base.js')
      )) as {
        theme: Record<string, Record<string, string>>
        properties: Record<string, string>
      }
      const dts = readOutput('theme-base.d.ts')

      Object.keys(theme).forEach((group) => {
        expect(dts, `theme.${group} missing from types`).toContain(`${group}: {`)
      })
      Object.keys(properties).forEach((name) => {
        expect(dts, `${name} missing from types`).toContain(`'${name}'`)
      })
    })

    it('every colour token should reach both the js theme and native output', () => {
      const colourTokens = baseTokens.filter(({ path: p }) => p[0] === 'color')
      const swiftNames = swiftConstantNames(readOutput('theme-base.swift'))

      expect(colourTokens.length).toBeGreaterThan(150)
      colourTokens.forEach((token) => {
        expect(swiftNames, `${token.path.join('.')} missing from Swift`).toContain(
          nativeName(token.path)
        )
      })
    })
  })

  describe('Per-theme outputs', () => {
    const themeSources: Record<string, string[]> = {
      atom: ['src/themes/atom/color.json', 'src/themes/atom/fonts.json'],
      quest: ['src/themes/quest/color.json', 'src/themes/quest/fonts.json']
    }

    Object.entries(themeSources).forEach(([themeName, files]) => {
      it(`${themeName} native output should contain exactly its colour overrides`, () => {
        const tokens = files.flatMap((file) => flatten(readJson(file)))
        const expected = tokens.filter(isNativeToken).map((token) => nativeName(token.path))
        const actual = swiftConstantNames(readOutput(`theme-${themeName}.swift`))

        expect([...actual].sort()).toEqual([...expected].sort())
      })
    })

    it('quest-reports should contain quest colours plus its own font scale', () => {
      const questColours = flatten(readJson('src/themes/quest/color.json'))
      const reportFonts = flatten(readJson('src/themes/quest/reports/sizes.json'))
      const expected = [...questColours, ...reportFonts]
        .filter(isNativeToken)
        .map((token) => nativeName(token.path))
      const actual = swiftConstantNames(readOutput('theme-quest-reports.swift'))

      expect([...actual].sort()).toEqual([...expected].sort())
    })
  })
})
