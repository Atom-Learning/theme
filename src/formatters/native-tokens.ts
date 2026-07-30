import { pascalCase } from 'pascal-case'
import { getBuildConfig, shouldIncludeProperty } from './shared.ts'

interface Property {
  attributes: {
    type: string
    category: string
    item?: string
    subitem?: string
  }
  value: string | number
  name: string
  filePath?: string
}

export interface Dictionary {
  allTokens?: Property[]
  allProperties?: Property[]
}

export interface Rgba {
  red: number
  green: number
  blue: number
  alpha: number
}

export interface ColorToken {
  name: string
  color: Rgba
}

export interface NumberToken {
  name: string
  value: number
}

export interface NativeTokens {
  colors: ColorToken[]
  fontSizes: NumberToken[]
  lineHeights: NumberToken[]
  radii: NumberToken[]
  space: NumberToken[]
}

// Native platforms treat 1rem as 16pt/16dp
const REM_TO_PT = 16

const isPlainNumber = (value: unknown): boolean => {
  if (typeof value !== 'string' && typeof value !== 'number') return false
  const str = String(value).trim()
  return /^-?\d*\.?\d+$/.test(str) && !/[a-zA-Z%]/.test(str)
}

const round = (value: number, decimals = 5): number => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const hue = ((h % 360) + 360) % 360
  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = l - chroma / 2

  let rgb: [number, number, number]
  if (hue < 60) rgb = [chroma, x, 0]
  else if (hue < 120) rgb = [x, chroma, 0]
  else if (hue < 180) rgb = [0, chroma, x]
  else if (hue < 240) rgb = [0, x, chroma]
  else if (hue < 300) rgb = [x, 0, chroma]
  else rgb = [chroma, 0, x]

  return [rgb[0] + m, rgb[1] + m, rgb[2] + m]
}

export const parseColor = (value: string): Rgba | null => {
  const str = value.trim()

  const hexMatch = str.match(/^#([0-9a-fA-F]{3,8})$/)
  if (hexMatch) {
    let hex = hexMatch[1]
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('')
    }
    if (hex.length !== 6 && hex.length !== 8) return null
    const red = parseInt(hex.slice(0, 2), 16) / 255
    const green = parseInt(hex.slice(2, 4), 16) / 255
    const blue = parseInt(hex.slice(4, 6), 16) / 255
    const alpha = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
    return { red, green, blue, alpha }
  }

  const hslMatch = str.match(
    /^hsla?\(\s*(-?[\d.]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/
  )
  if (hslMatch) {
    const [red, green, blue] = hslToRgb(
      parseFloat(hslMatch[1]),
      parseFloat(hslMatch[2]) / 100,
      parseFloat(hslMatch[3]) / 100
    )
    const alpha = hslMatch[4] === undefined ? 1 : parseFloat(hslMatch[4])
    return {
      red: round(red),
      green: round(green),
      blue: round(blue),
      alpha
    }
  }

  return null
}

// Flat camelCase name from the token path, matching the JS theme naming:
// color.blue.800 -> blue800, color.subject.gcse-maths -> subjectGcseMaths,
// size.font.sm -> fontSm. `base` segments collapse (color.info.base -> info).
const camelName = (type: string, item?: string, subitem = ''): string => {
  if (!item || item === 'base') return type
  if (subitem === 'base') subitem = ''
  return parseInt(item)
    ? `${type}${item}${subitem}`
    : `${type}${pascalCase(item)}${pascalCase(subitem)}`
}

export const collectNativeTokens = (dictionary: Dictionary): NativeTokens => {
  const config = getBuildConfig()
  const properties = dictionary.allTokens || dictionary.allProperties || []

  const tokens: NativeTokens = {
    colors: [],
    fontSizes: [],
    lineHeights: [],
    radii: [],
    space: []
  }
  const seenNames = new Set<string>()

  const registerName = (name: string, property: Property): string => {
    if (seenNames.has(name)) {
      throw new Error(
        `Duplicate native token name "${name}" (from ${property.attributes.category}.${property.attributes.type}.${property.attributes.item || ''}) — native constant names must be unique`
      )
    }
    seenNames.add(name)
    return name
  }

  properties.forEach((property) => {
    if (
      !shouldIncludeProperty(
        property as unknown as Parameters<typeof shouldIncludeProperty>[0],
        config
      )
    )
      return

    const { category, type, item, subitem } = property.attributes

    if (category === 'color') {
      const color = parseColor(String(property.value))
      if (!color) {
        throw new Error(
          `Unable to convert colour token "${property.name}" with value "${property.value}" for native output`
        )
      }
      tokens.colors.push({
        name: registerName(camelName(type, item, subitem || ''), property),
        color
      })
      return
    }

    if (category !== 'size') return

    // font.families (web font stacks), size.breakpoint (windowed-web concern),
    // size.size and effects don't translate to native — deliberately excluded
    if (type !== 'font' && type !== 'leading' && type !== 'radii' && type !== 'space')
      return

    if (!isPlainNumber(property.value)) {
      throw new Error(
        `Unable to convert size token "${property.name}" with value "${property.value}" for native output — expected a unitless number`
      )
    }
    const numValue =
      typeof property.value === 'number'
        ? property.value
        : parseFloat(String(property.value))

    const name = registerName(camelName(type, item), property)

    if (type === 'leading') {
      // unitless line-height multipliers, emitted as-is
      tokens.lineHeights.push({ name, value: numValue })
    } else {
      const target =
        type === 'font' ? tokens.fontSizes : type === 'radii' ? tokens.radii : tokens.space
      target.push({ name, value: round(numValue * REM_TO_PT) })
    }
  })

  return tokens
}

export const formatNumber = (value: number): string => String(round(value))
