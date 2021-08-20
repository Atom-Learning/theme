const transformPropertiesToTheme =
  require('./system-ui-theme').transformPropertiesToTheme

const formatter = (dictionary) => {
  const theme = transformPropertiesToTheme(dictionary)

  return `export type Theme = {${Object.entries(theme)
    .filter(([_, value]) => Boolean(value))
    .map(
      ([key]) =>
        `\n  "${key}": {${Object.keys(theme[key])
          .map((token) => `\n    "${token}": string`)
          .join('')}\n  }`
    )}\n}`
}

module.exports = formatter
