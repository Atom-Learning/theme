module.exports = (name) => ({
  source: ['src/properties/**/*.json', name && `src/themes/${name}.json`],
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
          // purposely omitting category === 'ratios'
          // The ratio values include a slash (`/`) which is deprecated in the sass
          // version we use. As sass is legacy for us and we are going to remove it, we
          // decided that is not worth the hassle to make it work
          filter: ({ attributes: { category } }) =>
            category === 'size' || category === 'effects'
        }
      ],
      name,
      actions: ['merge-files']
    },
    js: {
      transformGroup: 'js',
      transforms: ['attribute/cti', 'name/cti/pascal', 'size/rem', 'color/hsl'],
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
})
