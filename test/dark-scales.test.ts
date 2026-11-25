import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

import {
  BRANDS,
  REFERENCES,
  brandScale,
  checkScale,
  darkScales,
  toTokens
} from '../src/dark-scales.ts'

const read = (...parts: string[]) =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), ...parts), 'utf-8'))

describe('Dark scales', () => {
  it('match what the generator writes', () => {
    expect(read('src', 'properties', 'colors-dark.json')).toEqual(
      toTokens(darkScales())
    )
  })

  it('give every hue a scale', () => {
    expect(Object.keys(darkScales())).toEqual(Object.keys(REFERENCES))
  })

  it.each(Object.keys(REFERENCES))(
    '%s gets lighter at every step and keeps its text steps readable',
    (hue) => {
      expect(checkScale(hue, darkScales()[hue])).toEqual([])
    }
  )

  it.each(Object.keys(BRANDS))('%s has the dark primary scale the generator writes', (brand) => {
    const written = read('src', 'themes', brand, 'color.json').color['dark-primary']
    expect(Object.values(written).map((step) => (step as { $value: string }).$value)).toEqual(
      brandScale(brand)
    )
  })
})
