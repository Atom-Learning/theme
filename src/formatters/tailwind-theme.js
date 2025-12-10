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

      console.log({ name })

      return `--${name}: ${value};`
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
