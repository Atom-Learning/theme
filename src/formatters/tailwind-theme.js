// Check if a value is a plain number (not already containing units)
const isPlainNumber = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') return false
  const str = String(value).trim()
  // Check if it's a number (including decimals) and doesn't contain unit characters
  return /^-?\d*\.?\d+$/.test(str) && !/[a-zA-Z%]/.test(str)
}

// Append rem to plain numeric values
const formatValue = (value, category, type) => {
  // Don't modify colors, shadows, or font families
  if (
    category === 'color' ||
    category === 'effects' ||
    (category === 'font' && type === 'families')
  ) {
    return value
  }

  // If it's a plain number, append rem
  if (isPlainNumber(value)) {
    return `${value}rem`
  }

  return value
}

const transformPropertiesToTheme = (dictionary) =>
  dictionary.allProperties
    .map((property) => {
      const { type, category, item } = property.attributes

      let name = property.name.replace('-base', '')
      let value = property.value

      if (
        (category === 'size' && (type === 'size' || type === 'space')) ||
        category === 'ratios'
      ) {
        return
      }

      console.log({ name, category, type, item, value })

      if (category === 'color') {
        name = `color-${type}${name !== 'base' ? `-${name}` : ''}`
      }
      if (category === 'size' && type === 'font') {
        name = `text-${item}`
      }
      if (category === 'size' && type === 'radii') {
        name = `radius-${item}`
      }
      if (category === 'size' && type === 'breakpoint') {
        name = `breakpoint-${item}`
      }
      if (category === 'font' && type === 'families') {
        name = `font-${item}`
      }
      if (category === 'effects' && type === 'shadows') {
        name = `shadow-${item}`
      }

      // Format the value to append rem for numeric values
      const formattedValue = formatValue(value, category, type)

      return `--${name}: ${formattedValue};`
    })
    .filter((property) => !!property)

const formatter = (dictionary) => {
  const theme = transformPropertiesToTheme(dictionary).join('\n  ')
  return `
@theme {
  --color-*: initial;
  --font-*: initial;
  --text-*: initial;
  --radius-*: initial;
  --shadow-*: initial;
  ${theme}

  --default-font-family: var(--font-body);
}
`
}

module.exports = formatter
