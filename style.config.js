module.exports = {
  source: ['src/properties/**/*.json'],
  platforms: {
    scss: {
      transformGroup: 'scss',
      buildPath: 'lib/',
      transforms: [
        'scsslist',
        'attribute/cti',
        'name/cti/kebab',
        'time/seconds',
        'content/icon',
        'size/rem',
        'color/css'
      ],
      files: [
        {
          destination: '_variables.scss',
          format: 'scss/variables',
          filter: ({ attributes: { category } }) =>
            category === 'color' || category === 'font' || category === 'ratio'
        },
        {
          destination: '_scales.scss',
          format: 'custom/format/scss-map-flat',
          filter: ({ attributes: { category } }) =>
            category === 'size' || category === 'effects'
        }
      ],
      actions: ['merge-files', 'prefix-file']
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
