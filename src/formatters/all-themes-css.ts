import { getBuildConfig, shouldIncludeProperty } from './shared.ts'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface Property {
  attributes: {
    type: string
    category: string
    item: string
  }
  value: string | number
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

    const value = formatValue(property.value, category, type)
    cssVars.push(`  ${varName}: ${value};`)
  })

  return cssVars.join('\n')
}

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
  .theme-${themeName} {
${cssVars}
  }
}
`

  // Write to a temporary file for later combination
  const tempPath = join(process.cwd(), 'lib', `.theme-${themeName}.css.tmp`)
  writeFileSync(tempPath, themeCSS, 'utf-8')

  // Return empty string as we'll combine all themes at the end
  return ''
}

formatter.nested = true

export default formatter
export { setBuildConfig } from './shared.ts'
