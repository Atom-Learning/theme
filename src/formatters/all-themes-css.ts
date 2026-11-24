import { getBuildConfig, shouldIncludeProperty, tokenValue } from './shared.ts'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface Property {
  attributes: {
    type: string
    category: string
    item: string
  }
  value?: string | number
  $value?: string | number
  name: string
  filePath?: string
  $deprecated?: string | boolean
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

const formatValue = (
  value: string | number,
  category: string,
  type: string
): string => {
  const strValue = String(value)
  if (
    category === 'color' ||
    category === 'effects' ||
    (category === 'font' && type === 'families') ||
    (category === 'size' && type === 'leading')
  ) {
    return strValue
  }
  return isPlainNumber(strValue) ? `${strValue}rem` : strValue
}

const generateCustomPropertyName = (property: Property): string => {
  const { type, category, item } = property.attributes
  let name = property.name.replace('-base', '')

  if (
    (category === 'size' && (type === 'size' || type === 'space')) ||
    category === 'ratios'
  ) {
    return ''
  }

  if (category === 'color') {
    name =
      type === name
        ? `color-${type}`
        : `color-${type}${name !== 'base' ? `-${name}` : ''}`
  } else if (category === 'size' && type === 'font') {
    name = `text-${item}`
  } else if (category === 'size' && type === 'leading') {
    name = `text-${item}--line-height`
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

const generateThemeCSS = (
  dictionary: Dictionary,
  config?: ReturnType<typeof getBuildConfig>
): string => {
  const properties = dictionary.allTokens || dictionary.allProperties || []
  const cssVars: string[] = []

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

    const varName = generateCustomPropertyName(property)
    if (!varName) return

    const value = formatValue(tokenValue(property), category, type)
    if (property.$deprecated)
      cssVars.push(`  /* @deprecated ${property.$deprecated} */`)
    cssVars.push(`  ${varName}: ${value};`)
  })

  return cssVars.join('\n')
}

export const BRANDS: Record<string, string> = {
  atom: 'atom',
  'atom-school': 'school',
  quest: 'quest'
}
// Any one brand's reports build carries the scale: it is the same for all of them
const REPORTS_SOURCE = 'quest-reports'

const selectorFor = (themeName: string): string => {
  const brand = BRANDS[themeName]
  return brand
    ? `[data-brand='${brand}'],\n  .theme-${themeName}`
    : `.theme-${themeName}`
}

const textSizes = (cssVars: string): string =>
  cssVars
    .split('\n')
    .filter((line) => line.trim().startsWith('--text-'))
    .join('\n')

const formatter = (dictionary: Dictionary): string => {
  const config = getBuildConfig()
  const themeName = config.themePath
    ? config.themePath.replace('src/themes/', '').replace(/\//g, '-')
    : 'base'

  if (themeName === 'base') {
    // For base theme, return empty string as it shouldn't be in the combined file
    return ''
  }

  const cssVars = generateThemeCSS(dictionary, config)
  if (!cssVars) {
    return ''
  }

  const themeCSS = `@layer theme {
  ${selectorFor(themeName)} {
${cssVars}
  }
}
`

  if (themeName === REPORTS_SOURCE) {
    writeFileSync(
      join(process.cwd(), 'lib', 'reports.css'),
      `@layer theme {\n  :root {\n${textSizes(cssVars)}\n  }\n}\n`,
      'utf-8'
    )
  }

  // Write to a temporary file for later combination
  const tempPath = join(process.cwd(), 'lib', `.theme-${themeName}.css.tmp`)
  writeFileSync(tempPath, themeCSS, 'utf-8')

  // Return empty string as we'll combine all themes at the end
  return ''
}

formatter.nested = true

export default formatter
export { setBuildConfig } from './shared.ts'
