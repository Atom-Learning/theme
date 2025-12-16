const transformPropertiesToTheme =
  require('./system-ui-theme').transformPropertiesToTheme

// Check if a property name needs quotes (e.g., starts with number like "2xl")
const needsQuotes = (name) => {
  return /^\d/.test(name)
}

// Format a property name with or without quotes
const formatPropertyName = (name) => {
  return needsQuotes(name) ? `'${name}'` : name
}

// Escape string for TypeScript literal type
const escapeString = (str) => {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"')
}

const formatter = (dictionary) => {
  const theme = transformPropertiesToTheme(dictionary)

  const constObjectEntries = Object.entries(theme)
    .filter(([_, value]) => Boolean(value))
    .map(([key, value]) => {
      const formattedKey = formatPropertyName(key)
      const nestedEntries = Object.entries(value)
        .map(([token, tokenValue]) => {
          const formattedToken = formatPropertyName(token)
          const escapedValue = escapeString(tokenValue)
          return `\n    ${formattedToken}: "${escapedValue}"`
        })
        .join('')
      return `\n  ${formattedKey}: {${nestedEntries}\n  }`
    })

  return `declare const theme: {${constObjectEntries.join('')}\n}

export type Theme = typeof theme

export default theme
`
}

module.exports = formatter
