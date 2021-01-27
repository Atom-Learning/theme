const removeEmptyOrNull = (obj) => {
  Object.keys(obj).map((key) => {
    if (Object.keys(obj[key]).length === 0) {
      obj[key] = undefined
    }
  })
  return obj
}

const prefix = (type, item) => {
  if (!item || item === 'base') return `$${type}`
  if (parseInt(item)) {
    return `$${type}${item}`
  }
  return `$${type}${item.charAt(0).toUpperCase() + item.slice(1)}`
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

const formatter = (dictionary) => {
  const theme = { ...schema }

  dictionary.allProperties.forEach((property) => {
    const { type, category, item } = property.attributes

    if (category === 'color') {
      theme.colors = {
        ...theme.colors,
        [prefix(type, item)]: property.value
      }
    }
    if (category === 'font') {
      theme.fonts = {
        ...theme.fonts,
        [prefix(item)]: property.value
      }
    }
    if (category === 'effects' && type === 'drop-shadows') {
      theme.shadows = {
        ...theme.shadows,
        [prefix(item)]: property.value
      }
    }

    if (category === 'size') {
      if (type === 'font') {
        theme.fontSizes = {
          ...theme.fontSizes,
          [prefix(item)]: property.value
        }
      }

      if (type === 'space') {
        theme.space = {
          ...theme.space,
          [prefix(item)]: property.value
        }
      }
      if (type === 'size') {
        theme.sizes = {
          ...theme.sizes,
          [prefix(item)]: property.value
        }
      }
      if (type === 'radii') {
        theme.radii = {
          ...theme.radii,
          [prefix(item)]: property.value
        }
      }
    }
  })

  return `export default ${JSON.stringify(removeEmptyOrNull(theme), null, 2)}`
}

module.exports = formatter
