import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

interface ThemeModule {
  theme: {
    colors: Record<string, string>
    fonts: Record<string, string>
    fontSizes?: Record<string, string>
  }
  properties: Record<string, string>
  default?: unknown
}

interface MediaModule {
  media: Record<string, string>
  default?: unknown
}

const themes = ['base', 'atom', 'quest', 'quest-reports'] as const
const themeSpecificThemes = ['atom', 'quest', 'quest-reports'] as const

describe('Theme Output Tests', () => {
  describe('JavaScript Output', () => {
    describe('Export Structure', () => {
      themes.forEach((themeName) => {
        it(`${themeName} should export theme and properties as named exports`, async () => {
          const module = (await import(
            path.join(process.cwd(), 'lib', `theme-${themeName}.js`)
          )) as ThemeModule

          expect(module).toHaveProperty('theme')
          expect(module).toHaveProperty('properties')
          expect(module.default).toBeUndefined()
        })
      })
    })

    describe('Base Theme', () => {
      it('should include all base properties', async () => {
        const { theme, properties } = (await import(
          path.join(process.cwd(), 'lib', 'theme-base.js')
        )) as ThemeModule

        expect(theme).toHaveProperty('colors')
        expect(theme).toHaveProperty('fonts')
        expect(properties).toHaveProperty('--color-text-bold')
        expect(properties).toHaveProperty('--font-sans')
      })
    })

    describe('Theme-Specific Filtering', () => {
      it('atom should only contain theme-specific tokens', async () => {
        const { theme, properties } = (await import(
          path.join(process.cwd(), 'lib', 'theme-atom.js')
        )) as ThemeModule

        expect(theme.colors).toHaveProperty('primary100')
        expect(theme.colors).not.toHaveProperty('textBold')
        expect(properties).toHaveProperty('--color-primary-100')
        expect(properties).not.toHaveProperty('--color-text-bold')
      })

      it('quest should have correct primary color values', async () => {
        const { theme } = (await import(
          path.join(process.cwd(), 'lib', 'theme-quest.js')
        )) as ThemeModule

        expect(theme.colors.primary100).toBe('hsl(151, 70%, 96%)')
        expect(theme.colors.primary500).toBe('hsl(151, 46%, 64%)')
      })

      it('quest-reports should include font sizes', async () => {
        const { theme, properties } = (await import(
          path.join(process.cwd(), 'lib', 'theme-quest-reports.js')
        )) as ThemeModule

        expect(theme.fontSizes).toHaveProperty('xs')
        expect(theme.fontSizes?.xs).toBe('0.625rem')
        expect(properties).toHaveProperty('--text-xs')
        expect(properties['--text-xs']).toBe('0.625rem')
      })
    })

    describe('Custom Properties Format', () => {
      it('should have all custom properties starting with -- and string values', async () => {
        const { properties } = (await import(
          path.join(process.cwd(), 'lib', 'theme-base.js')
        )) as ThemeModule

        Object.entries(properties).forEach(([key, value]) => {
          expect(key).toMatch(/^--/)
          expect(typeof value).toBe('string')
        })
      })

      it('should match theme values with properties values', async () => {
        const { theme, properties } = (await import(
          path.join(process.cwd(), 'lib', 'theme-atom.js')
        )) as ThemeModule

        expect(properties['--color-primary-100']).toBe(theme.colors.primary100)
        expect(properties['--font-display']).toBe(theme.fonts.display)
      })
    })
  })

  describe('CSS Output', () => {
    describe('Base Theme CSS', () => {
      it('should have @theme block with wildcard properties and default-font-family', () => {
        const css = fs.readFileSync(
          path.join(process.cwd(), 'lib', 'theme-base.css'),
          'utf-8'
        )

        expect(css).toContain('@theme static {')
        expect(css).toContain('--color-*: initial;')
        expect(css).toContain('--font-*: initial;')
        expect(css).toContain('--text-*: initial;')
        expect(css).toContain('--radius-*: initial;')
        expect(css).toContain('--shadow-*: initial;')
        expect(css).toContain('--default-font-family: var(--font-body);')
        expect(css).toContain('--color-text-bold:')
      })
    })

    describe('Theme-Specific CSS', () => {
      themeSpecificThemes.forEach((themeName) => {
        it(`${themeName} should have @theme block without wildcard properties`, () => {
          const css = fs.readFileSync(
            path.join(process.cwd(), 'lib', `theme-${themeName}.css`),
            'utf-8'
          )

          expect(css).toContain('@theme')
          expect(css).not.toContain('--color-*: initial;')
          expect(css).not.toContain('--default-font-family: var(--font-body);')
        })
      })

      it('atom should only contain primary colors and fonts', () => {
        const css = fs.readFileSync(
          path.join(process.cwd(), 'lib', 'theme-atom.css'),
          'utf-8'
        )

        expect(css).toContain('--color-primary-100:')
        expect(css).toContain('--font-display:')
        expect(css).not.toContain('--color-text-bold:')
      })

      it('quest-reports should include font size properties', () => {
        const css = fs.readFileSync(
          path.join(process.cwd(), 'lib', 'theme-quest-reports.css'),
          'utf-8'
        )

        expect(css).toContain('--text-xs:')
        expect(css).toContain('0.625rem')
      })
    })
  })

  describe('TypeScript Output', () => {
    describe('Export Structure', () => {
      themes.forEach((themeName) => {
        it(`${themeName} should export theme, properties, and types`, () => {
          const dts = fs.readFileSync(
            path.join(process.cwd(), 'lib', `theme-${themeName}.d.ts`),
            'utf-8'
          )

          expect(dts).toContain('export const theme:')
          expect(dts).toContain('export const properties:')
          expect(dts).toContain('export type Theme = typeof theme')
          expect(dts).toContain('export type Properties = typeof properties')
          expect(dts).not.toContain('export default')
        })

        it(`${themeName} should have quoted CSS custom property names`, () => {
          const dts = fs.readFileSync(
            path.join(process.cwd(), 'lib', `theme-${themeName}.d.ts`),
            'utf-8'
          )

          const hasQuotedProps = dts.includes("'--") || dts.includes('"--')
          expect(hasQuotedProps).toBe(true)
        })
      })
    })

    describe('Theme-Specific Content', () => {
      it('atom should only have primary colors in theme type', () => {
        const dts = fs.readFileSync(
          path.join(process.cwd(), 'lib', 'theme-atom.d.ts'),
          'utf-8'
        )

        expect(dts).toContain('primary100:')
        expect(dts).not.toContain('textBold:')
        expect(dts).not.toContain('grey100:')
      })
    })
  })

  describe('Media Queries Output', () => {
    it('should export media as named export', async () => {
      const module = (await import(
        path.join(process.cwd(), 'lib', 'media.js')
      )) as MediaModule

      expect(module).toHaveProperty('media')
      expect(module.default).toBeUndefined()
    })

    it('should have correct breakpoint values', async () => {
      const { media } = (await import(
        path.join(process.cwd(), 'lib', 'media.js')
      )) as MediaModule

      expect(media).toEqual({
        sm: '(min-width: 34.375rem)',
        md: '(min-width: 50rem)',
        lg: '(min-width: 68.75rem)',
        xl: '(min-width: 84.375rem)'
      })
    })

    it('should have TypeScript types', () => {
      const dts = fs.readFileSync(
        path.join(process.cwd(), 'lib', 'media.d.ts'),
        'utf-8'
      )

      expect(dts).toContain('export const media:')
      expect(dts).toContain('export type Media = typeof media')
      expect(dts).toContain('sm: "(min-width: 34.375rem)"')
      expect(dts).toContain('md: "(min-width: 50rem)"')
    })
  })
})
