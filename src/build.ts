import path from 'node:path'
import { parseArgs } from 'node:util'

import { setBuildConfig } from './formatters/shared.ts'
import * as dree from 'dree'
import StyleDictionary from 'style-dictionary'

import sysmtemUi from './formatters/system-ui-theme.ts'
import sysmtemUiTypes from './formatters/system-ui-theme-types.ts'
import tailwindTheme from './formatters/tailwind-theme.ts'
import mediaQueries from './formatters/media-queries.ts'
import mediaQueriesTypes from './formatters/media-queries-types.ts'
import actionCopyAssets from './actions/copy-assets.ts'
import config from './style.config.ts'

const formatters = {
  'custom/format/system-ui-theme': sysmtemUi,
  'custom/format/system-ui-theme-types': sysmtemUiTypes,
  'custom/format/tailwind-theme': tailwindTheme,
  'custom/format/media-queries': mediaQueries,
  'custom/format/media-queries-types': mediaQueriesTypes
}

const { values: argv } = parseArgs({
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

  const buildConfig = {
    includeBase: includeBaseInOutput,
    themePath: configObj.themePath
  }

  setBuildConfig(buildConfig)

  // Style Dictionary v5: Create instance with config
  const sd = new StyleDictionary(configObj)

  // Register formats and actions on the instance
  Object.entries(formatters).forEach(([name, formatter]) => {
    sd.registerFormat({ name, format: formatter })
  })

  sd.registerAction({
    name: 'copy_assets',
    do: actionCopyAssets
  })

  // Build all platforms (v5 uses async)
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

const run = async (): Promise<void> => {
  console.log('Building base theme...')
  await buildTheme([], true, true)

  const { children } = dree.scan(
    path.resolve(process.cwd(), argv.path || './src/themes'),
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
}

run().catch((error) => {
  console.error('Build failed:', error)
  process.exit(1)
})
