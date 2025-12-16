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

const formatter = (dictionary) => {
  const theme = transformPropertiesToTheme(dictionary)

  const typeEntries = Object.entries(theme)
    .filter(([_, value]) => Boolean(value))
    .map(([key, value]) => {
      const formattedKey = formatPropertyName(key)
      const nestedEntries = Object.keys(value)
        .map((token) => {
          const formattedToken = formatPropertyName(token)
          return `\n    ${formattedToken}: string`
        })
        .join('')
      return `\n  ${formattedKey}: {${nestedEntries}\n  }`
    })

  return `export type Theme = {${typeEntries.join('')}\n}

declare const theme: Theme
export default theme
`
}

module.exports = formatter
