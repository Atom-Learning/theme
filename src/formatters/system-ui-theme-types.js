const transformPropertiesToTheme =
  require('./system-ui-theme').transformPropertiesToTheme

const formatter = (dictionary) => {
  const theme = transformPropertiesToTheme(dictionary)
  return `export interface Theme ${JSON.stringify(theme, null, 2)}`
}

module.exports = formatter
