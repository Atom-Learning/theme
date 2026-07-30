import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

interface PackageJson {
  files: string[]
  exports: Record<string, string | Record<string, string>>
}

const pkg = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
) as PackageJson

const resolve = (relative: string): string =>
  path.join(process.cwd(), relative.replace(/^\.\//, ''))

const assetExports = Object.entries(pkg.exports).filter(([key]) =>
  key.startsWith('./assets/')
)

const stringExports = Object.entries(pkg.exports).flatMap(([key, value]) =>
  typeof value === 'string' ? [[key, value] as const] : []
)

const conditionExports = Object.entries(pkg.exports).flatMap(([key, value]) =>
  typeof value === 'string'
    ? []
    : Object.entries(value).map(([condition, target]) => [key, condition, target] as const)
)

describe('Package Outputs', () => {
  describe('Assets', () => {
    it('should declare asset export paths', () => {
      expect(assetExports.length).toBeGreaterThan(0)
    })

    assetExports.forEach(([key, target]) => {
      it(`${key} should be copied into lib`, () => {
        const file = resolve(target as string)

        expect(fs.existsSync(file), `${target} was not built`).toBe(true)
        expect(fs.statSync(file).size, `${target} is empty`).toBeGreaterThan(0)
      })
    })

    it('should copy the source asset tree without dropping files', () => {
      const collect = (dir: string): string[] =>
        fs.existsSync(dir)
          ? fs
              .readdirSync(dir, { recursive: true, encoding: 'utf-8' })
              .filter((entry) => fs.statSync(path.join(dir, entry)).isFile())
              .sort()
          : []

      const source = collect(path.join(process.cwd(), 'assets'))
      const built = collect(path.join(process.cwd(), 'lib', 'assets'))

      expect(source.length).toBeGreaterThan(0)
      expect(built).toEqual(source)
    })

    it('svg logos should be valid svg and pngs should have a png signature', () => {
      assetExports.forEach(([, target]) => {
        const file = resolve(target as string)
        if (file.endsWith('.svg')) {
          expect(fs.readFileSync(file, 'utf-8')).toContain('<svg')
        } else if (file.endsWith('.png')) {
          expect([...fs.readFileSync(file).subarray(1, 4)]).toEqual([0x50, 0x4e, 0x47])
        } else if (file.endsWith('.woff2')) {
          expect(fs.readFileSync(file).subarray(0, 4).toString('ascii')).toBe('wOF2')
        }
      })
    })
  })

  describe('Export map', () => {
    it('every export target should exist in lib', () => {
      const targets = [
        ...stringExports.map(([, target]) => target),
        ...conditionExports.map(([, , target]) => target)
      ]

      expect(targets.length).toBeGreaterThan(0)
      targets.forEach((target) => {
        expect(fs.existsSync(resolve(target)), `${target} missing from lib`).toBe(true)
      })
    })

    it('main and types entry points should exist', () => {
      const { main, types } = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      ) as { main: string; types: string }

      expect(fs.existsSync(resolve(main))).toBe(true)
      expect(fs.existsSync(resolve(types))).toBe(true)
    })

    it('typesVersions targets should exist', () => {
      const { typesVersions } = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      ) as { typesVersions: Record<string, Record<string, string[]>> }

      Object.values(typesVersions['*']).forEach((paths) => {
        paths.forEach((target) => {
          expect(fs.existsSync(resolve(target)), `${target} missing`).toBe(true)
        })
      })
    })

    it('native outputs should ship inside the published files list', () => {
      // no explicit exports entry needed — the native repos vendor these
      // straight out of the tarball (e.g. via unpkg)
      expect(pkg.files).toContain('lib')
      ;['base', 'atom', 'quest', 'quest-reports'].forEach((themeName) => {
        expect(fs.existsSync(resolve(`./lib/theme-${themeName}.swift`))).toBe(true)
        expect(fs.existsSync(resolve(`./lib/theme-${themeName}.kt`))).toBe(true)
      })
    })
  })
})
