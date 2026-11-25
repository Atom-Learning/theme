import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), 'lib', file), 'utf-8')

const OLD = [
  ['textBold', '--color-text-bold'],
  ['textRegular', '--color-text-regular'],
  ['textSubtle', '--color-text-subtle'],
  ['textMinimal', '--color-text-minimal'],
  ['background', '--color-background'],
  ['backgroundAccent', '--color-background-accent']
]

describe('Deprecated aliases', () => {
  it.each(OLD)('marks %s and %s as deprecated, keeping their values', async (key, property) => {
    const types = read('theme-base.d.ts')
    const css = read('theme-base.css')
    const { theme, properties } = await import(
      path.join(process.cwd(), 'lib', 'theme-base.js')
    )

    expect(types).toMatch(new RegExp(`@deprecated Use the [\\w-]+ role .*\\n\\s+${key}:`))
    expect(types).toMatch(new RegExp(`@deprecated Use the [\\w-]+ role .*\\n\\s+'${property}':`))
    expect(css).toMatch(new RegExp(`/\\* @deprecated Use the [\\w-]+ role .*\\*/\\n\\s+${property}:`))
    expect(theme.colors[key]).toBeTruthy()
    expect(properties[property]).toBe(theme.colors[key])
  })

  it('deprecates nothing else', () => {
    expect(read('theme-base.d.ts').match(/@deprecated/g)).toHaveLength(12)
    expect(read('theme-base.css').match(/@deprecated/g)).toHaveLength(6)
  })
})
