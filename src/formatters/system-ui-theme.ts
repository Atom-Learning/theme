import { pascalCase } from 'pascal-case'
import { getBuildConfig, shouldIncludeProperty } from './shared.ts'

interface Property {
  attributes: {
    type: string
    category: string
    item: string
    subitem?: string
  }
  value: string | number
  path?: string[]
  name: string
  filePath?: string
}

interface Dictionary {
  allTokens?: Property[]
  allProperties?: Property[]
}

interface Theme {
  [key: string]: Record<string, string> | undefined
}

const schema: Theme = {
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
  transitions: {},
  ratios: {}
}

const matchSchema: Record<string, string> = {
  'effects.shadows': 'shadows',
  font: 'fonts',
  'size.font': 'fontSizes',
  'size.radii': 'radii',
  'size.size': 'sizes',
  'size.space': 'space',
  'ratios.ratio': 'ratios'
}

const removeEmpty = (obj: Theme): Theme => {
  Object.keys(obj).forEach((key) => {
    if (Object.keys(obj[key] || {}).length === 0) {
      obj[key] = undefined
    }
  })
  return obj
}

const prefix = (type: string, item?: string, subitem = ''): string => {
  if (!item || item === 'base') return type
  if (subitem === 'base') subitem = ''
  return parseInt(item)
    ? `${type}${item}${subitem}`
    : `${type}${pascalCase(item)}${pascalCase(subitem)}`
}

export const transformPropertiesToTheme = (
  dictionary: Dictionary,
  config?: ReturnType<typeof getBuildConfig>
): Theme => {
  const theme: Theme = { ...schema }
  const properties = dictionary.allTokens || dictionary.allProperties || []

  properties.forEach((property) => {
    if (
      !shouldIncludeProperty(
        property as unknown as Parameters<typeof shouldIncludeProperty>[0],
        config
      )
    )
      return

    const { type, category, item, subitem } = property.attributes
    const key = matchSchema[`${category}.${type}`] || matchSchema[category]

    if (category === 'color') {
      theme.colors = {
        ...(theme.colors as Record<string, string>),
        [prefix(type, item, subitem || '')]: String(property.value)
      }
      return
    }

    if (!key) return

    // Format font sizes with rem
    let value = property.value
    if (category === 'size' && type === 'font' && typeof value === 'number') {
      value = `${value}rem`
    } else {
      value = String(value)
    }

    theme[key] = {
      ...(theme[key] as Record<string, string>),
      [prefix(item)]: value
    }
  })

  return removeEmpty(theme)
}

const pascalToKebab = (str: string): string => {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

const generateCustomPropertyName = (property: Property): string => {
  const { type, category, item } = property.attributes
  const pathName =
    property.path && property.path.length > 0
      ? property.path[property.path.length - 1]
      : property.name
  let name = pascalToKebab(pathName).replace('-base', '')

  if (category === 'color') {
    const typeKebab = type ? pascalToKebab(type) : ''
    name =
      typeKebab === name
        ? `color-${typeKebab}`
        : `color-${typeKebab}${name !== 'base' ? `-${name}` : ''}`
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

  return `--${name}`
}

export const generateCustomProperties = (
  dictionary: Dictionary,
  config?: ReturnType<typeof getBuildConfig>
): Record<string, string> => {
  const customProperties: Record<string, string> = {}
  const properties = dictionary.allTokens || dictionary.allProperties || []

  properties.forEach((property) => {
    if (
      !shouldIncludeProperty(
        property as unknown as Parameters<typeof shouldIncludeProperty>[0],
        config
      )
    )
      return

    const { type, category } = property.attributes

    if (
      (category === 'size' && (type === 'size' || type === 'space')) ||
      category === 'ratios'
    ) {
      return
    }

    // Format font sizes with rem
    let value = property.value
    if (category === 'size' && type === 'font' && typeof value === 'number') {
      value = `${value}rem`
    } else {
      value = String(value)
    }

    customProperties[generateCustomPropertyName(property)] = value
  })

  return customProperties
}

const formatter = (dictionary: Dictionary): string => {
  const config = getBuildConfig()
  const theme = transformPropertiesToTheme(dictionary, config)
  const properties = generateCustomProperties(dictionary, config)

  return `export const theme = ${JSON.stringify(theme, null, 2)}

export const properties = ${JSON.stringify(properties, null, 2)}`
}

formatter.nested = true

export default formatter
export { setBuildConfig } from './shared.ts'
