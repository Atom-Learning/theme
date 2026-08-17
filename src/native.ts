import { pascalCase } from 'pascal-case'
import { getBuildConfig, shouldIncludeProperty } from './formatters/shared.ts'

interface TransformedToken {
  attributes?: {
    category?: string
    type?: string
    item?: string
    subitem?: string
  }
  filePath?: string
  [key: string]: unknown
}

// Flat camelCase names from the token path — these become the native apps'
// API, so renames are breaking: color.blue.800 -> blue800,
// color.subject.gcse-maths -> subjectGcseMaths, size.font.sm -> fontSm.
// `base` segments collapse (color.info.base -> info, size.space.base -> space).
export const nativeName = (token: TransformedToken): string => {
  const { type = '', item, subitem = '' } = token.attributes || {}
  if (!item || item === 'base') return type
  const sub = subitem === 'base' ? '' : subitem
  return parseInt(item)
    ? `${type}${item}${sub}`
    : `${type}${pascalCase(item)}${pascalCase(sub)}`
}

const NATIVE_SIZE_TYPES = ['font', 'leading', 'radii', 'space']

// Colours, type scale, line heights, radii and spacing only. font.families
// (web font stacks), size.breakpoint (windowed-web concern), size.size and
// effects (CSS shadow strings) deliberately don't ship to native.
const isNativeToken = (token: TransformedToken): boolean => {
  const { category, type } = token.attributes || {}
  if (category === 'color') return true
  return category === 'size' && NATIVE_SIZE_TYPES.includes(type || '')
}

export const nativeTokenFilter = (token: TransformedToken): boolean =>
  isNativeToken(token) &&
  shouldIncludeProperty(
    token as Parameters<typeof shouldIncludeProperty>[0],
    getBuildConfig()
  )
