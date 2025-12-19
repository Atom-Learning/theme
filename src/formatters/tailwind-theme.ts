import { getBuildConfig, shouldIncludeProperty, isBaseTheme } from './shared.ts'

interface Property {
  attributes: {
    type: string
    category: string
    item: string
  }
  value: string
  name: string
  filePath?: string
}

interface Dictionary {
  allTokens?: Property[]
  allProperties?: Property[]
}

const isPlainNumber = (value: unknown): boolean => {
  if (typeof value !== 'string' && typeof value !== 'number') return false
  const str = String(value).trim()
  return /^-?\d*\.?\d+$/.test(str) && !/[a-zA-Z%]/.test(str)
}

const formatValue = (value: string, category: string, type: string): string => {
  if (
    category === 'color' ||
    category === 'effects' ||
    (category === 'font' && type === 'families')
  ) {
    return value
  }
  return isPlainNumber(value) ? `${value}rem` : value
}

const transformPropertiesToTheme = (dictionary: Dictionary, config?: ReturnType<typeof getBuildConfig>): string[] => {
  const properties = dictionary.allTokens || dictionary.allProperties || []
  return properties
    .map((property) => {
      if (!shouldIncludeProperty(property, config)) return

      const { type, category, item } = property.attributes
      let name = property.name.replace('-base', '')

      if (
        (category === 'size' && (type === 'size' || type === 'space')) ||
        category === 'ratios'
      ) {
        return
      }

      if (category === 'color') {
        name = type === name
          ? `color-${type}`
          : `color-${type}${name !== 'base' ? `-${name}` : ''}`
      } else if (category === 'size' && type === 'font') {
        name = `text-${item}`
      } else if (category === 'size' && type === 'radii') {
        name = `radius-${item}`
      } else if (category === 'size' && type === 'breakpoint') {
        name = `breakpoint-${item}`
      } else if (category === 'font' && type === 'families') {
        name = `font-${item}`
      } else if (category === 'effects' && type === 'shadows') {
        name = `shadow-${item}`
      }

      return `--${name}: ${formatValue(property.value, category, type)};`
    })
    .filter((property): property is string => Boolean(property))
}

const formatter = (dictionary: Dictionary): string => {
  const config = getBuildConfig()
  const theme = transformPropertiesToTheme(dictionary, config).join('\n  ')
  const isBase = isBaseTheme(config)

  const wildcardProperties = isBase
    ? `  --color-*: initial;
  --font-*: initial;
  --text-*: initial;
  --radius-*: initial;
  --shadow-*: initial;
`
    : ''

  const defaultFontFamily = isBase
    ? `\n  --default-font-family: var(--font-body);`
    : ''

  return `
@theme static {
${wildcardProperties}  ${theme}${defaultFontFamily}
}
`
}

export default formatter
export { setBuildConfig } from './shared.ts'

