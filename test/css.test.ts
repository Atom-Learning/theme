import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const lib = path.join(process.cwd(), 'lib')
const stylesheets = fs
  .readdirSync(lib)
  .filter((file) => file.endsWith('.css'))
  .sort()

describe('CSS output', () => {
  it.each(stylesheets)('%s matches its snapshot', async (file) => {
    await expect(
      fs.readFileSync(path.join(lib, file), 'utf-8')
    ).toMatchFileSnapshot(path.join('__snapshots__', file))
  })
})
