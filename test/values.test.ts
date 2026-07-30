import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const readOutput = (file: string): string =>
  fs.readFileSync(path.join(process.cwd(), 'lib', file), 'utf-8')

const themes = ['base', 'atom', 'quest', 'quest-reports'] as const

// hsl -> sRGB, mirroring what the native transforms do, so the assertions below
// are derived from the source tokens rather than copied from the output
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - chroma / 2
  const [r, g, b] =
    h < 60
      ? [chroma, x, 0]
      : h < 120
        ? [x, chroma, 0]
        : h < 180
          ? [0, chroma, x]
          : h < 240
            ? [0, x, chroma]
            : h < 300
              ? [x, 0, chroma]
              : [chroma, 0, x]
  return [r + m, g + m, b + m]
}

const parseHsl = (value: string): { rgb: [number, number, number]; alpha: number } => {
  const match = value.match(
    /hsla?\(\s*(-?[\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+))?\)/
  )
  if (!match) throw new Error(`not an hsl value: ${value}`)
  return {
    rgb: hslToRgb(
      parseFloat(match[1]),
      parseFloat(match[2]) / 100,
      parseFloat(match[3]) / 100
    ),
    alpha: match[4] === undefined ? 1 : parseFloat(match[4])
  }
}

describe('Value Fidelity', () => {
  describe('Shadows', () => {
    it('base css should emit full box-shadow values, not just the reset', () => {
      const css = readOutput('theme-base.css')

      expect(css).toContain(
        '--shadow-sm: 0 1px 3px hsla(0, 0%, 20%, 0.1), 0 1px 2px hsla(0, 0%, 20%, 0.15);'
      )
      expect(css).toContain(
        '--shadow-md: 0 3px 6px hsla(0, 0%, 20%, 0.1), 0 3px 6px hsla(0, 0%, 20%, 0.1);'
      )
      expect(css).toContain(
        '--shadow-lg: 0 10px 20px hsla(0, 0%, 20%, 0.1), 0 6px 6px hsla(0, 0%, 20%, 0.1);'
      )
      expect(css).toContain(
        '--shadow-xl: 0 14px 28px hsla(0, 0%, 20%, 0.15), 0 10px 10px hsla(0, 0%, 20%, 0.1);'
      )
    })

    it('shadow aliases should be fully resolved, with no unresolved references', async () => {
      const { theme, properties } = (await import(
        path.join(process.cwd(), 'lib', 'theme-base.js')
      )) as {
        theme: { shadows: Record<string, string> }
        properties: Record<string, string>
      }

      expect(Object.keys(theme.shadows)).toEqual(['sm', 'md', 'lg', 'xl'])
      Object.values(theme.shadows).forEach((value) => {
        expect(value).not.toMatch(/[{}]/)
        expect(value).toContain('hsla(')
      })
      expect(properties['--shadow-sm']).toBe(theme.shadows.sm)
    })
  })

  describe('Breakpoints', () => {
    it('css breakpoint values should match the media query output exactly', async () => {
      const css = readOutput('theme-base.css')
      const { media } = (await import(path.join(process.cwd(), 'lib', 'media.js'))) as {
        media: Record<string, string>
      }

      expect(css).toContain('--breakpoint-sm: 34.375rem;')
      expect(css).toContain('--breakpoint-md: 50rem;')
      expect(css).toContain('--breakpoint-lg: 68.75rem;')
      expect(css).toContain('--breakpoint-xl: 84.375rem;')

      Object.entries(media).forEach(([key, query]) => {
        const size = query.replace('(min-width: ', '').replace(')', '')
        expect(css).toContain(`--breakpoint-${key}: ${size};`)
      })
    })
  })

  describe('Font families', () => {
    it('base should emit the full web font stacks', async () => {
      const { properties } = (await import(
        path.join(process.cwd(), 'lib', 'theme-base.js')
      )) as { properties: Record<string, string> }

      expect(properties['--font-sans']).toBe(
        "system-ui, -apple-system, 'Helvetica Neue', sans-serif"
      )
      expect(properties['--font-mono']).toBe("'SFMono-Regular', Consolas, Menlo, monospace")
      // display/body alias sans in base and must be resolved, not a reference
      expect(properties['--font-display']).toBe(properties['--font-sans'])
      expect(properties['--font-body']).toBe(properties['--font-sans'])
    })

    it('atom should override display and body with its bundled faces', async () => {
      const { properties } = (await import(
        path.join(process.cwd(), 'lib', 'theme-atom.js')
      )) as { properties: Record<string, string> }

      expect(properties['--font-display']).toContain("'National 2 Condensed'")
      expect(properties['--font-body']).toContain("'Inter'")
      expect(properties['--font-display']).not.toMatch(/[{}]/)
    })
  })

  describe('Cross-output consistency', () => {
    themes.forEach((themeName) => {
      it(`${themeName} swift colours should match the js theme colours`, async () => {
        const { theme } = (await import(
          path.join(process.cwd(), 'lib', `theme-${themeName}.js`)
        )) as { theme: { colors?: Record<string, string> } }
        const swift = readOutput(`theme-${themeName}.swift`)

        const colors = theme.colors || {}
        expect(Object.keys(colors).length).toBeGreaterThan(0)

        Object.entries(colors).forEach(([name, value]) => {
          const match = swift.match(
            new RegExp(
              `public static let ${name} = Color\\(red: ([\\d.]+), green: ([\\d.]+), blue: ([\\d.]+), opacity: ([\\d.]+)\\)`
            )
          )
          expect(match, `${name} missing from theme-${themeName}.swift`).not.toBeNull()
          if (!match) return

          // hex tokens (#000/#fff) are exact; hsl tokens are compared after conversion
          if (value.startsWith('#')) {
            const hex = value.slice(1)
            const expand = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex
            const channels = [0, 2, 4].map(
              (offset) => parseInt(expand.slice(offset, offset + 2), 16) / 255
            )
            channels.forEach((channel, index) => {
              expect(parseFloat(match[index + 1])).toBeCloseTo(channel, 2)
            })
          } else {
            const { rgb, alpha } = parseHsl(value)
            rgb.forEach((channel, index) => {
              expect(
                parseFloat(match[index + 1]),
                `${name} channel ${index} should match ${value}`
              ).toBeCloseTo(channel, 2)
            })
            expect(parseFloat(match[4])).toBeCloseTo(alpha, 3)
          }
        })
      })

      it(`${themeName} kotlin colours should match the swift colours`, () => {
        const swift = readOutput(`theme-${themeName}.swift`)
        const kotlin = readOutput(`theme-${themeName}.kt`)

        const kotlinColors = [...kotlin.matchAll(/val (\w+) = Color\(0x([0-9a-f]{8})\)/g)]
        expect(kotlinColors.length).toBeGreaterThan(0)

        kotlinColors.forEach(([, name, argb]) => {
          const match = swift.match(
            new RegExp(
              `public static let ${name} = Color\\(red: ([\\d.]+), green: ([\\d.]+), blue: ([\\d.]+), opacity: ([\\d.]+)\\)`
            )
          )
          expect(match, `${name} missing from Swift output`).not.toBeNull()
          if (!match) return

          const alpha = parseInt(argb.slice(0, 2), 16) / 255
          const channels = [2, 4, 6].map(
            (offset) => parseInt(argb.slice(offset, offset + 2), 16) / 255
          )

          channels.forEach((channel, index) => {
            expect(
              parseFloat(match[index + 1]),
              `${name} channel ${index} should agree across native outputs`
            ).toBeCloseTo(channel, 2)
          })
          expect(parseFloat(match[4])).toBeCloseTo(alpha, 2)
        })
      })

      it(`${themeName} native font sizes should be the js rem values × 16`, async () => {
        const { theme } = (await import(
          path.join(process.cwd(), 'lib', `theme-${themeName}.js`)
        )) as { theme: { fontSizes?: Record<string, string> } }
        const swift = readOutput(`theme-${themeName}.swift`)

        Object.entries(theme.fontSizes || {}).forEach(([key, value]) => {
          const pt = parseFloat(value) * 16
          const name = `font${key.charAt(0).toUpperCase()}${key.slice(1)}`
          expect(swift, `${name} should be ${pt}pt`).toContain(
            `public static let ${name} = CGFloat(${pt.toFixed(2)})`
          )
        })
      })
    })
  })
})
