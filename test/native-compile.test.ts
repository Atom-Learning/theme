import { describe, it, expect } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const themes = ['base', 'atom', 'quest', 'quest-reports'] as const

const hasTool = (tool: string): boolean =>
  spawnSync('which', [tool], { stdio: 'ignore' }).status === 0

const libPath = (file: string): string => path.join(process.cwd(), 'lib', file)

// Invoking a real compiler is far slower than vitest's 5s default, and slower
// again on CI runners than locally
const COMPILE_TIMEOUT = 180_000

// Minimal stand-ins for the Compose APIs the generated file references, so the
// output can be type-checked without pulling in the Android toolchain.
const COMPOSE_COLOR_STUB = `package androidx.compose.ui.graphics

class Color(val value: Long) {
    constructor(value: Int) : this(value.toLong())
}
`

const COMPOSE_UNIT_STUBS = `package androidx.compose.ui.unit

class Dp(val value: Float)
class TextUnit(val value: Float)

val Double.dp: Dp get() = Dp(this.toFloat())
val Int.dp: Dp get() = Dp(this.toFloat())
val Double.sp: TextUnit get() = TextUnit(this.toFloat())
val Int.sp: TextUnit get() = TextUnit(this.toFloat())
`

describe.skipIf(!hasTool('swiftc'))('Swift output compiles', () => {
  themes.forEach((themeName) => {
    it(
      `theme-${themeName}.swift should parse with swiftc`,
      () => {
        expect(() =>
          execFileSync('swiftc', ['-parse', libPath(`theme-${themeName}.swift`)], {
            stdio: 'pipe'
          })
        ).not.toThrow()
      },
      COMPILE_TIMEOUT
    )
  })
})

describe.skipIf(!hasTool('kotlinc'))('Kotlin output compiles', () => {
  themes.forEach((themeName) => {
    it(
      `theme-${themeName}.kt should compile with kotlinc`,
      () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), `theme-kt-${themeName}-`))
        try {
          const graphics = path.join(dir, 'ComposeColorStub.kt')
          const units = path.join(dir, 'ComposeUnitStub.kt')
          fs.writeFileSync(graphics, COMPOSE_COLOR_STUB)
          fs.writeFileSync(units, COMPOSE_UNIT_STUBS)

          expect(() =>
            execFileSync(
              'kotlinc',
              [
                graphics,
                units,
                libPath(`theme-${themeName}.kt`),
                '-nowarn',
                '-d',
                path.join(dir, 'out')
              ],
              { stdio: 'pipe' }
            )
          ).not.toThrow()
        } finally {
          fs.rmSync(dir, { recursive: true, force: true })
        }
      },
      COMPILE_TIMEOUT
    )
  })
})
