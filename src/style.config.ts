interface Platform {
  transforms: string[]
  buildPath: string
  files: Array<{ destination: string; format: string }>
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

const COMMON_TRANSFORMS = [
  'attribute/cti',
  'name/pascal',
  'size/rem',
  'color/hsl'
]
const CSS_TRANSFORMS = ['attribute/cti', 'color/hsl']

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
    'assets/copy': {
      actions: ['copy_assets'],
      buildPath: 'lib/',
      transformGroup: 'assets',
      files: []
    }
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
