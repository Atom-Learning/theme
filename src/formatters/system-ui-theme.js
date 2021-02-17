const removeEmpty = (obj) => {
  Object.keys(obj).map((key) => {
    if (Object.keys(obj[key]).length === 0) {
      obj[key] = undefined
    }
  })
  return obj
}

const prefix = (type, item) => {
  if (!item || item === 'base') {
    return type
  }

  if (parseInt(item)) {
    return `${type}${item}`
  }

  return `${type}${item.charAt(0).toUpperCase() + item.slice(1)}`
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

const formatter = (dictionary) => {
  const theme = { ...schema }

  dictionary.allProperties.forEach((property) => {
    const { type, category, item } = property.attributes
    const key = matchSchema[`${category}.${type}`] || matchSchema[category]

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

  return `module.exports = ${JSON.stringify(removeEmpty(theme), null, 2)}`
}

module.exports = formatter
