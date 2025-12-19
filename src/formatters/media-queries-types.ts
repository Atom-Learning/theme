import { getBuildConfig, isBaseTheme } from './shared.ts'

interface Property {
  attributes: {
    category: string
    type: string
    item: string
  }
  value: string
}

interface Dictionary {
  allTokens?: Property[]
  allProperties?: Property[]
}

const formatter = (dictionary: Dictionary): string => {
  const config = getBuildConfig()
  if (!isBaseTheme(config)) {
    return 'export const media: Record<string, string> = {}'
  }

  const media: Record<string, string> = {}
  const properties = dictionary.allTokens || dictionary.allProperties || []
  properties.forEach((property) => {
    const { category, type, item } = property.attributes
    if (category === 'size' && type === 'breakpoint') {
      media[item] = `(min-width: ${property.value})`
    }
  })

  const entries = Object.entries(media)
    .map(([key, value]) => `\n  ${key}: "${value}"`)
    .join('')

  return `export const media: {${entries}\n}

export type Media = typeof media
`
}

export default formatter
export { setBuildConfig } from './shared.ts'

