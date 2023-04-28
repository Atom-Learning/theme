module.exports = {
  source: ['src/properties/**/*.json'],
  platforms: {
    scss: {
      transformGroup: 'scss',
      buildPath: 'lib/',
      files: [
        {
          destination: '_variables.scss',
          format: 'scss/variables',
          filter: ({ attributes: { category } }) =>
            category === 'color' || category === 'font'
        },
        {
          destination: '_scales.scss',
          format: 'custom/format/scss-map-flat',
          filter: ({ attributes: { category } }) =>
            category === 'size' || category === 'effects' || category === 'ratios'
        }
      ],
      actions: ['merge-files']
    },
    js: {
      transformGroup: 'js',
      transforms: ['attribute/cti', 'name/cti/pascal', 'size/rem', 'color/hsl'],
      buildPath: 'lib/',
      files: [
        {
          destination: 'index.js',
          format: 'custom/format/system-ui-theme'
        }
      ]
    },
    ts: {
      transformGroup: 'js',
      buildPath: 'lib/',
      files: [
        {
          destination: 'index.d.ts',
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
