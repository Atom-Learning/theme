import { getBuildConfig, isBaseTheme, tokenValue } from './shared.ts'

interface Property {
  attributes: {
    category: string
    type: string
    item: string
  }
  value?: string | number
  $value?: string | number
}

interface Dictionary {
  allTokens?: Property[]
  allProperties?: Property[]
}

const generateMediaQueries = (
  dictionary: Dictionary
): Record<string, string> => {
  const media: Record<string, string> = {}
  const properties = dictionary.allTokens || dictionary.allProperties || []
  properties.forEach((property) => {
    const { category, type, item } = property.attributes
    if (category === 'size' && type === 'breakpoint') {
      media[item] = `(min-width: ${tokenValue(property)})`
    }
  })
  return media
}

const formatter = (dictionary: Dictionary): string => {
  const config = getBuildConfig()
  if (!isBaseTheme(config)) {
    return 'export const media = {}'
  }

  const media = generateMediaQueries(dictionary)
  return `export const media = ${JSON.stringify(media, null, 2)}`
}

formatter.nested = true

export default formatter
export { setBuildConfig } from './shared.ts'
