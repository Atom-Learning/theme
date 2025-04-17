module.exports = (themes) => {
  const name = themes.join('-')
  const source = ['src/properties/**/*.json']

  themes.reduce((prev, curr) => {
    source.push(`src/themes${prev}/${curr}/*.json`)
    return `${prev}/${curr}`
  }, '')

  console.log(`Building theme from source: ${source}`)

  return {
    source,
    platforms: {
      js: {
        transformGroup: 'js',
        transforms: [
          'attribute/cti',
          'name/cti/pascal',
          'size/rem',
          'color/hsl'
        ],
        buildPath: 'lib/',
        files: [
          {
            destination: name ? `theme-${name}.js` : 'index.js',
            format: 'custom/format/system-ui-theme'
          }
        ]
      },
      ts: {
        transformGroup: 'js',
        buildPath: 'lib/',
        files: [
          {
            destination: name ? `theme-${name}.d.ts` : 'index.d.ts',
            format: 'custom/format/system-ui-theme-types'
          }
        ]
      },
      'assets/copy': {
        actions: ['copy_assets'],
        buildPath: 'lib/',
        transformGroup: 'assets'
      }
    }
  }
}
