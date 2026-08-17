import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { parseToRgba } from 'color2k'

const readOutput = (file: string): string =>
  fs.readFileSync(path.join(process.cwd(), 'lib', file), 'utf-8')

const themes = ['base', 'atom', 'quest', 'quest-reports'] as const

// Any CSS colour (hex, hsl, hsla) -> normalised sRGB channels in 0-1.
// color2k is a deliberately different implementation from the tinycolor2 that
// style-dictionary converts with, so these assertions are an independent
// check rather than a restatement of the build's own maths.
const toSrgb = (
  value: string
): { channels: [number, number, number]; alpha: number } => {
  const [red, green, blue, alpha] = parseToRgba(value)
  return { channels: [red / 255, green / 255, blue / 255], alpha }
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

          const { channels, alpha } = toSrgb(value)
          channels.forEach((channel, index) => {
            expect(
              parseFloat(match[index + 1]),
              `${name} channel ${index} should match ${value}`
            ).toBeCloseTo(channel, 2)
          })
          expect(parseFloat(match[4]), `${name} opacity should match ${value}`).toBeCloseTo(
            alpha,
            3
          )
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

          // Compose packs colours as AARRGGBB; reorder to the RRGGBBAA that
          // CSS (and so color2k) understands
          const { channels, alpha } = toSrgb(`#${argb.slice(2)}${argb.slice(0, 2)}`)

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
