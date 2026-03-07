import { parseArgs } from 'node:util'
import StyleDictionary from 'style-dictionary'
import path from 'node:path'
import * as dree from 'dree'

import mediaQueries from './formatters/media-queries.ts'
import systemUiTypes from './formatters/system-ui-theme-types.ts'
import mediaQueriesTypes from './formatters/media-queries-types.ts'
import systemUi from './formatters/system-ui-theme.ts'
import tailwindTheme from './formatters/tailwind-theme.ts'
import allThemesCss from './formatters/all-themes-css.ts'
import { setBuildConfig } from './formatters/shared.ts'
import { readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

import config from './style.config.ts'

const { values } = parseArgs({
  options: {
    path: {
      type: 'string',
      default: './src/themes'
    }
  },
  allowPositionals: true
})

const buildTheme = async (
  themes: string[],
  includeBaseInSource = true,
  includeBaseInOutput = true
): Promise<void> => {
  const configObj = config(themes, includeBaseInSource)
  configObj.includeBase = includeBaseInOutput
  configObj.themePath = configObj.themePath || null

  const sd = new StyleDictionary(configObj)

  setBuildConfig({
    includeBase: includeBaseInOutput,
    themePath: configObj.themePath
  })

  sd.registerFormat({
    name: 'custom/format/system-ui-theme',
    format: systemUi
  })
  sd.registerFormat({
    name: 'custom/format/system-ui-theme-types',
    format: systemUiTypes
  })
  sd.registerFormat({
    name: 'custom/format/tailwind-theme',
    format: tailwindTheme
  })
  sd.registerFormat({
    name: 'custom/format/media-queries',
    format: mediaQueries
  })
  sd.registerFormat({
    name: 'custom/format/media-queries-types',
    format: mediaQueriesTypes
  })
  sd.registerFormat({
    name: 'custom/format/all-themes-css',
    format: allThemesCss
  })

  await sd.buildAllPlatforms()
}

interface DreeChild {
  type: 'directory' | 'file'
  name: string
  children?: DreeChild[]
}

const buildNestedTheme = async (
  directories: string[],
  children: DreeChild[],
  includeBase = false
): Promise<void> => {
  await buildTheme(directories, true, includeBase)

  for (const dir of children.filter((child) => child.type === 'directory')) {
    await buildNestedTheme(
      [...directories, dir.name],
      dir.children || [],
      includeBase
    )
  }
}

const combineAllThemes = (): void => {
  const libPath = join(process.cwd(), 'lib')
  const tempFiles = readdirSync(libPath).filter((file) =>
    file.startsWith('.theme-') && file.endsWith('.css.tmp')
  )

  if (tempFiles.length === 0) {
    return
  }

  const themeContents: string[] = []

  for (const tempFile of tempFiles.sort()) {
    const content = readFileSync(join(libPath, tempFile), 'utf-8').trim()
    if (content) {
      themeContents.push(content)
    }
    unlinkSync(join(libPath, tempFile))
  }

  if (themeContents.length > 0) {
    const combinedCSS = themeContents.join('\n\n')
    writeFileSync(join(libPath, 'themes.css'), combinedCSS, 'utf-8')
    console.log(`Combined ${themeContents.length} themes into lib/themes.css`)
  }
}

const run = async (): Promise<void> => {
  console.log('Building base theme...')
  await buildTheme([], true, true)

  const { children } = dree.scan(
    path.resolve(process.cwd(), values.path || './src/themes'),
    {
      size: false,
      sizeInBytes: false,
      hash: false,
      stat: false
    }
  )

  for (const dir of children) {
    await buildNestedTheme([dir.name], dir.children || [], false)
  }

  // Combine all theme CSS files into one
  combineAllThemes()
}

run().catch((error) => {
  console.error('Build failed:', error)
  process.exit(1)
})
