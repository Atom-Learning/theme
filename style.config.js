module.exports = {
  source: ['src/properties/**/*.json'],
  platforms: {
    scss: {
      transformGroup: 'scss',
      buildPath: 'dist/',
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
            category === 'size' || category === 'effects'
        }
      ],
      actions: ['merge-files']
    },
    js: {
      transformGroup: 'js',
      transforms: ['attribute/cti', 'name/cti/pascal', 'size/rem', 'color/hsl'],
      buildPath: 'dist/',
      files: [
        {
          destination: 'index.js',
          format: 'custom/format/system-ui-theme'
        }
      ]
    }
  }
}
