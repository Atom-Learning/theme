import {
  transformPropertiesToTheme,
  generateCustomProperties,
  deprecations
} from './system-ui-theme.ts'
import { getBuildConfig } from './shared.ts'

interface Dictionary {
  allTokens?: unknown[]
  allProperties?: unknown[]
}

const needsQuotes = (name: string): boolean =>
  /^\d/.test(name) || name.startsWith('--')
const formatPropertyName = (name: string): string =>
  needsQuotes(name) ? `'${name}'` : name
const escapeString = (str: unknown): string => {
  const strValue = String(str ?? '')
  return strValue
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
}

const formatter = (dictionary: Dictionary): string => {
  const config = getBuildConfig()
  const theme = transformPropertiesToTheme(
    dictionary as Parameters<typeof transformPropertiesToTheme>[0],
    config
  )
  const properties = generateCustomProperties(
    dictionary as Parameters<typeof generateCustomProperties>[0],
    config
  )

  const deprecated = deprecations(
    dictionary as Parameters<typeof deprecations>[0],
    config
  )
  const jsdoc = (message: string | undefined, indent: string): string =>
    message === undefined
      ? ''
      : `\n${indent}/** @deprecated ${message} */`

  const constObjectEntries = Object.entries(theme)
    .filter(([_, value]) => Boolean(value))
    .map(([key, value]) => {
      const formattedKey = formatPropertyName(key)
      const nestedEntries = Object.entries(value as Record<string, string>)
        .map(([token, tokenValue]) => {
          const formattedToken = formatPropertyName(token)
          const escapedValue = escapeString(tokenValue)
          const doc = key === 'colors' ? jsdoc(deprecated.colors[token], '    ') : ''
          return `${doc}\n    ${formattedToken}: "${escapedValue}"`
        })
        .join('')
      return `\n  ${formattedKey}: {${nestedEntries}\n  }`
    })

  const propertiesEntries = Object.entries(properties)
    .map(([key, value]) => {
      const escapedValue = escapeString(value)
      return `${jsdoc(deprecated.properties[key], '  ')}\n  ${formatPropertyName(key)}: "${escapedValue}"`
    })
    .join('')

  return `export const theme: {${constObjectEntries.join('')}\n}

export type Theme = typeof theme

export const properties: {${propertiesEntries}\n}

export type Properties = typeof properties
`
}

formatter.nested = true

export default formatter
export { setBuildConfig } from './shared.ts'
