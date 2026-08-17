import { nativeTokenFilter } from './native.ts'

interface File {
  destination: string
  format: string
  filter?: (token: Record<string, unknown>) => boolean
  options?: Record<string, unknown>
}

interface Platform {
  transforms: string[]
  buildPath: string
  files: File[]
}

interface Config {
  source: string[]
  themeName: string
  themePath: string | null
  includeBase: boolean
  platforms: Record<
    string,
    Platform | { actions: string[]; buildPath: string; transformGroup: string }
  >
}

const COMMON_TRANSFORMS = ['attribute/cti', 'name/pascal']
const CSS_TRANSFORMS = ['attribute/cti']

// Built-in style-dictionary transforms convert values for native platforms:
// colours to sRGB Color initialisers, rem sizes to pt (× 16). size.leading
// has no transform on purpose — the multipliers pass through unitless.
const SWIFT_TRANSFORMS = [
  'attribute/cti',
  'name/native/camel',
  'color/ColorSwiftUI',
  'size/swift/remToCGFloat'
]
const COMPOSE_TRANSFORMS = [
  'attribute/cti',
  'name/native/camel',
  'color/composeColor',
  'size/compose/remToSp',
  'size/compose/remToDp'
]

const createPlatform = (
  transforms: string[],
  destination: string,
  format: string
): Platform => ({
  transforms,
  buildPath: 'lib/',
  files: [{ destination, format }]
})

export default (themes: string[], includeBase = true): Config => {
  const name = themes.join('-')
  const source: string[] = []

  if (includeBase) {
    source.push('src/properties/**/*.json')
  }

  const themePath = themes.reduce((prev, curr) => {
    source.push(`src/themes${prev}/${curr}/*.json`)
    return `${prev}/${curr}`
  }, '')

  console.log(`Building theme from source: ${source}`)

  const platforms: Config['platforms'] = {
    css: createPlatform(
      CSS_TRANSFORMS,
      name ? `theme-${name}.css` : 'theme-base.css',
      'custom/format/tailwind-theme'
    ),
    js: createPlatform(
      COMMON_TRANSFORMS,
      name ? `theme-${name}.js` : 'theme-base.js',
      'custom/format/system-ui-theme'
    ),
    ts: createPlatform(
      COMMON_TRANSFORMS,
      name ? `theme-${name}.d.ts` : 'theme-base.d.ts',
      'custom/format/system-ui-theme-types'
    ),
    swift: {
      transforms: SWIFT_TRANSFORMS,
      buildPath: 'lib/',
      files: [
        {
          destination: name ? `theme-${name}.swift` : 'theme-base.swift',
          format: 'ios-swift/enum.swift',
          filter: nativeTokenFilter,
          options: { className: 'ThemeTokens', import: ['SwiftUI'] }
        }
      ]
    },
    compose: {
      transforms: COMPOSE_TRANSFORMS,
      buildPath: 'lib/',
      files: [
        {
          destination: name ? `theme-${name}.kt` : 'theme-base.kt',
          format: 'compose/object',
          filter: nativeTokenFilter,
          options: {
            className: 'ThemeTokens',
            packageName: 'uk.co.atomlearning.theme'
          }
        }
      ]
    },
    'assets/copy': {
      actions: ['copy_assets'],
      buildPath: 'lib/',
      transformGroup: 'assets',
      files: []
    }
  }

  // Add all-themes-css platform for non-base themes
  if (name !== '') {
    platforms['all-themes-css'] = createPlatform(
      CSS_TRANSFORMS,
      `.theme-${name}.css.tmp`,
      'custom/format/all-themes-css'
    )
  }

  if (name === '') {
    platforms.media = createPlatform(
      COMMON_TRANSFORMS,
      'media.js',
      'custom/format/media-queries'
    )
    platforms['media-ts'] = createPlatform(
      COMMON_TRANSFORMS,
      'media.d.ts',
      'custom/format/media-queries-types'
    )
  }

  return {
    source,
    themeName: name || 'base',
    themePath: themePath ? `src/themes${themePath}` : null,
    includeBase,
    platforms
  }
}
