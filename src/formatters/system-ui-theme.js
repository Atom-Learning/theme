const removeEmpty = (obj) => {
  Object.keys(obj).map((key) => {
    if (Object.keys(obj[key]).length === 0) {
      obj[key] = undefined
    }
  })
  return obj
}

const capitalise = (str) => str.charAt(0).toUpperCase() + str.slice(1)

const prefix = (type, item) => {
  if (!item || item === 'base') {
    return type
  }

  if (parseInt(item)) {
    return `${type}${item}`
  }

  return `${type}${capitalise(item)}`
}

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
  transitions: {}
}

const matchSchema = {
  'effects.shadows': 'shadows',
  font: 'fonts',
  'size.font': 'fontSizes',
  'size.radii': 'radii',
  'size.size': 'sizes',
  'size.space': 'space'
}

const transformPropertiesToTheme = (dictionary) => {
  const theme = { ...schema }

  dictionary.allProperties.forEach((property) => {
    const { type, category, item } = property.attributes
    const key = matchSchema[`${category}.${type}`] || matchSchema[category]

    if (!key) return

    if (category === 'color') {
      return (theme.colors = {
        ...theme.colors,
        [prefix(type, item)]: property.value
      })
    }

    theme[key] = {
      ...theme[key],
      [prefix(item)]: property.value
    }
  })

  return removeEmpty(theme)
}

const formatter = (dictionary) => {
  const theme = transformPropertiesToTheme(dictionary)
  return `module.exports = ${JSON.stringify(theme, null, 2)}`
}

module.exports = formatter
module.exports.transformPropertiesToTheme = transformPropertiesToTheme
