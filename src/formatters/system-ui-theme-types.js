const transformPropertiesToTheme =
  require('./system-ui-theme').transformPropertiesToTheme

const formatter = (dictionary) => {
  const theme = transformPropertiesToTheme(dictionary)

  return `export type Theme = { ${Object.entries(theme)
    .filter(([key, value]) => Boolean(value))
    .map(
      ([key]) =>
        `"${key}": { ${Object.keys(theme[key]).map(
          (token) => `"${token}": string`
        )}}`
    )}}`
}

module.exports = formatter
