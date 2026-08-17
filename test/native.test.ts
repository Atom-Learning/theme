import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const themes = ['base', 'atom', 'quest', 'quest-reports'] as const

const readOutput = (file: string): string =>
  fs.readFileSync(path.join(process.cwd(), 'lib', file), 'utf-8')

const swiftConstantNames = (source: string): string[] =>
  [...source.matchAll(/public static let (\w+)/g)].map((match) => match[1])

const kotlinConstantNames = (source: string): string[] =>
  [...source.matchAll(/\bval (\w+)/g)].map((match) => match[1])

describe('Native Token Outputs', () => {
  describe('Swift Output', () => {
    themes.forEach((themeName) => {
      const file = `theme-${themeName}.swift`

      it(`${themeName} should declare a ThemeTokens enum importing SwiftUI`, () => {
        const swift = readOutput(file)

        expect(swift).toContain('import SwiftUI')
        expect(swift).toContain('public enum ThemeTokens {')
        expect(swiftConstantNames(swift).length).toBeGreaterThan(0)
      })

      it(`${themeName} should contain no unconverted hsl/hex/rem values`, () => {
        const swift = readOutput(file)

        expect(swift).not.toMatch(/hsla?\(/)
        expect(swift).not.toMatch(/#[0-9a-fA-F]/)
        expect(swift).not.toMatch(/\d\s*rem/)
      })

      it(`${themeName} should have no duplicate constant names`, () => {
        const names = swiftConstantNames(readOutput(file))

        expect(new Set(names).size).toBe(names.length)
      })
    })

    it('base should convert colours to sRGB Color initialisers', () => {
      const swift = readOutput('theme-base.swift')

      expect(swift).toContain(
        'public static let black = Color(red: 0.000, green: 0.000, blue: 0.000, opacity: 1)'
      )
      expect(swift).toContain(
        'public static let white = Color(red: 1.000, green: 1.000, blue: 1.000, opacity: 1)'
      )
      // hsl(0, 0%, 96%)
      expect(swift).toContain(
        'public static let grey100 = Color(red: 0.961, green: 0.961, blue: 0.961, opacity: 1)'
      )
      // hsla(0, 0%, 20%, 0.1) carries its opacity component
      expect(swift).toContain(
        'public static let alpha100 = Color(red: 0.200, green: 0.200, blue: 0.200, opacity: 0.1)'
      )
    })

    it('base should convert sizes from rem to pt as CGFloat', () => {
      const swift = readOutput('theme-base.swift')

      expect(swift).toContain('public static let fontSm = CGFloat(14.00)')
      expect(swift).toContain('public static let radiiMd = CGFloat(8.00)')
      expect(swift).toContain('public static let space = CGFloat(4.00)')
      // leading multipliers are emitted as-is, unitless
      expect(swift).toContain('public static let leadingMd = 1.5')
    })

    it('base should use flat camelCase names from the token path', () => {
      const names = swiftConstantNames(readOutput('theme-base.swift'))

      expect(names).toContain('blue800')
      expect(names).toContain('subjectGcseMaths')
      expect(names).toContain('glBlueLight')
      expect(names).toContain('fontSm')
    })

    it('base should exclude font families, breakpoints and effects', () => {
      const swift = readOutput('theme-base.swift')

      expect(swift).not.toContain('system-ui')
      expect(swift).not.toMatch(/breakpoint/i)
      expect(swift).not.toMatch(/shadow/i)
    })

    it('atom should only contain theme-specific tokens', () => {
      const names = swiftConstantNames(readOutput('theme-atom.swift'))

      expect(names).toContain('primary100')
      expect(names).not.toContain('textBold')
      expect(names).not.toContain('grey100')
    })
  })

  describe('Kotlin Output', () => {
    themes.forEach((themeName) => {
      const file = `theme-${themeName}.kt`

      it(`${themeName} should declare a ThemeTokens object importing Compose types`, () => {
        const kotlin = readOutput(file)

        expect(kotlin).toContain('package uk.co.atomlearning.theme')
        expect(kotlin).toContain('import androidx.compose.ui.graphics.Color')
        expect(kotlin).toContain('import androidx.compose.ui.unit.*')
        expect(kotlin).toContain('object ThemeTokens {')
        expect(kotlinConstantNames(kotlin).length).toBeGreaterThan(0)
      })

      it(`${themeName} should contain no unconverted hsl/hex/rem values`, () => {
        const kotlin = readOutput(file)

        expect(kotlin).not.toMatch(/hsla?\(/)
        expect(kotlin).not.toMatch(/#[0-9a-fA-F]/)
        expect(kotlin).not.toMatch(/\d\s*rem/)
      })

      it(`${themeName} should have no duplicate constant names`, () => {
        const names = kotlinConstantNames(readOutput(file))

        expect(new Set(names).size).toBe(names.length)
      })
    })

    it('base should convert colours to ARGB Color constants', () => {
      const kotlin = readOutput('theme-base.kt')

      expect(kotlin).toContain('val black = Color(0xff000000)')
      expect(kotlin).toContain('val white = Color(0xffffffff)')
      // hsl(0, 0%, 96%)
      expect(kotlin).toContain('val grey100 = Color(0xfff5f5f5)')
      // hsla(0, 0%, 20%, 0.1) carries its opacity in the alpha byte
      expect(kotlin).toContain('val alpha100 = Color(0x1a333333)')
    })

    it('base should convert sizes to sp/dp and leave leading unitless', () => {
      const kotlin = readOutput('theme-base.kt')

      expect(kotlin).toContain('val fontSm = 14.00.sp')
      expect(kotlin).toContain('val radiiMd = 8.00.dp')
      expect(kotlin).toContain('val space = 4.00.dp')
      expect(kotlin).toContain('val leadingMd = 1.5')
    })

    it('atom should only contain theme-specific tokens', () => {
      const names = kotlinConstantNames(readOutput('theme-atom.kt'))

      expect(names).toContain('primary100')
      expect(names).not.toContain('textBold')
      expect(names).not.toContain('grey100')
    })

    it('quest-reports should convert its font size overrides', () => {
      const kotlin = readOutput('theme-quest-reports.kt')

      // 0.625rem × 16
      expect(kotlin).toContain('val fontXs = 10.00.sp')
    })
  })
})
