const { pascalCase } = require('pascal-case')

const schema = {
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
  transitions: {},
  ratios: {}
}

const matchSchema = {
  'effects.shadows': 'shadows',
  font: 'fonts',
  'size.font': 'fontSizes',
  'size.radii': 'radii',
  'size.size': 'sizes',
  'size.space': 'space',
  'ratios.ratio': 'ratios'
}

/**
 *
 * @param {object} obj
 * @returns
 */
const removeEmpty = (obj) => {
  Object.keys(obj).map((key) => {
    if (Object.keys(obj[key]).length === 0) {
      obj[key] = undefined
    }
  })
  return obj
}

/**
 *
 * @param {string} type
 * @param {string} item
 * @param {string} subitem
 * @returns {string}
 */
const prefix = (type, item, subitem = '') => {
  if (!item || item === 'base') {
    return type
  }
  if (subitem === 'base') {
    subitem = ''
  }

  if (parseInt(item)) {
    return `${type}${item}${subitem}`
  }

  return `${type}${pascalCase(item)}${pascalCase(subitem)}`
}

/**
 *
 * @param {{
 *    allProperties: {
 *      type: string
 *      category: string
 *      item: string
 *      subitem: string
 *    }[]
 * }} dictionary
 * @returns {object}
 */
const transformPropertiesToTheme = (dictionary) => {
  const theme = { ...schema }

  dictionary.allProperties.forEach((property) => {
    const { type, category, item, subitem } = property.attributes
    const key = matchSchema[`${category}.${type}`] || matchSchema[category]

    if (category === 'color') {
      return (theme.colors = {
        ...theme.colors,
        [prefix(type, item, subitem)]: property.value
      })
    }

    if (!key) return

    theme[key] = {
      ...theme[key],
      [prefix(item)]: property.value
    }
  })

  return removeEmpty(theme)
}

/**
 *
 * @param {object} dictionary
 * @returns {string}
 */
const formatter = (dictionary) => {
  const theme = transformPropertiesToTheme(dictionary)
  return `module.exports = ${JSON.stringify(theme, null, 2)}`
}

module.exports = formatter
module.exports.transformPropertiesToTheme = transformPropertiesToTheme
