const { property } = require('lodash')

const config = {
  source: ['src/properties/**/*.json'],
  platforms: {
    scss: {
      transformGroup: 'scss',
      buildPath: 'dist/scss/',
      files: [
        {
          destination: '_colors.scss',
          format: 'scss/variables',
          filter: { attributes: { category: 'color' } }
        },
        {
          destination: '_sizes.scss',
          format: 'custom/format/scss-map-flat-indexed',
          filter: { attributes: { category: 'size' } }
        }
      ]
    },
    js: {
      transformGroup: 'js',
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

const StyleDictionary = require('style-dictionary').extend(config)

StyleDictionary.registerFormat({
  name: 'custom/format/system-ui-theme',
  formatter: (dictionary) => {
    const theme = {
      colors: {},
      space: {},
      fontSizes: {},
      fonts: {},
      fontWeights: {},
      lineHeights: {},
      letterSpacings: {},
      sizes: {},
      borders: {},
      borderWidths: {},
      borderStyles: {},
      radii: {},
      shadows: {},
      zIndices: {},
      transitions: {}
    }

    const prefix = (type, item) => {
      if (!item || item === 'base') return `$${type}`
      if (parseInt(item)) {
        return `$${type}${item}`
      }
      return `$${type}${item.charAt(0).toUpperCase() + item.slice(1)}`
    }

    dictionary.allProperties.forEach((property) => {
      const { type, category, item } = property.attributes
      console.log({ type, category, item })

      if (category === 'color') {
        theme.colors = {
          ...theme.colors,
          [prefix(type, item)]: property.value
        }
      }

      if (category === 'size' && type === 'font') {
        theme.fontSizes = {
          ...theme.fontSizes,
          [prefix(item)]: property.value
        }
      }

      if (category === 'size' && type === 'space') {
        theme.space = {
          ...theme.space,
          [prefix(item)]: property.value
        }
      }
    })

    return `export const tokens = ${JSON.stringify(theme, null, 2)}`
  }
})

StyleDictionary.registerFormat({
  name: 'custom/format/scss-map-flat-indexed',
  formatter: (dictionary) => {
    // group properties by category and type
    const properties = dictionary.allProperties.reduce((obj, curr, i) => {
      const { type, category, item } = curr.attributes
      const group = `${category}-${type}`
      return {
        ...obj,
        [group]: { ...obj[group], [item]: curr.value }
      }
    }, {})

    /**
     * $category-type: (
     *   key: val,
     *   key: val
     * )
     */
    return Object.entries(properties)
      .map(([key, val]) => {
        return `
$${key}: (${Object.entries(val).map(
          ([key, val]) => `
  ${key}: ${val}`
        )}
);`
      })
      .join('')
  }
})

StyleDictionary.buildAllPlatforms()
