module.exports = {
  source: ['src/properties/**/*.json'],
  platforms: {
    scss: {
      transformGroup: 'scss',
      buildPath: 'dist/scss/',
      files: [
        {
          destination: '_colors.scss',
          format: 'scss/variables',
          filter: ({ attributes: { category } }) =>
            category === 'color' || category === 'font'
        },
        {
          destination: '_sizes.scss',
          format: 'custom/format/scss-map-flat',
          filter: ({ attributes: { category } }) =>
            category === 'size' || category === 'effects'
        }
      ]
    },
    js: {
      transformGroup: 'js',
      transforms: ['attribute/cti', 'name/cti/pascal', 'size/rem', 'color/hsl'],
      buildPath: 'dist/js/',
      files: [
        {
          destination: 'index.js',
          format: 'custom/format/system-ui-theme'
        }
      ]
    }
  }
}
