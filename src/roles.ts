import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { getContrast } from 'color2k'

import { BRANDS } from './formatters/all-themes-css.ts'

type RoleGroup = Record<string, { $value: string }>

const PROPERTY: Record<string, string> = {
  background: 'background-color',
  text: 'text-color',
  border: 'border-color',
  outline: 'outline-color'
}

// Text roles and the step of the fill each one sits on
const ON_FILL: Record<string, string> = {
  'on-accent': '800',
  'on-accent-bold': '1000'
}
const DARK_INK = '{color.grey.1200}'

// The scale each brand theme redefines
const BRAND_OWNED = /^color\.primary\./

const DARK = "[data-color-scheme='dark']"

const reference = (value: string): string => value.replace(/[{}]/g, '')

const toVar = (value: string): string =>
  `var(--${reference(value).replace(/\.base$/, '').replace(/\./g, '-')})`

const themeSelectors = (themesPath: string, theme: string): string[] => [
  ...(BRANDS[theme] ? [`[data-brand='${BRANDS[theme]}']`] : []),
  `.theme-${theme}`,
  ...(existsSync(join(themesPath, theme, 'reports'))
    ? [`.theme-${theme}-reports`]
    : [])
]

const brandSelectors = (themesPath: string): string[] =>
  readdirSync(themesPath).flatMap((theme) => [
    `.theme-${theme}`,
    ...(existsSync(join(themesPath, theme, 'reports'))
      ? [`.theme-${theme}-reports`]
      : [])
  ])

interface Accents {
  hues: string[]
  tones: Record<
    string,
    {
      hue: string
      steps: Record<string, string>
      roles?: Record<string, string>
      dark?: Record<string, string>
    }
  >
}

interface Role {
  group: string
  name: string
  value: string
}

const declare = ({ group, name, value }: Role): string =>
  `--${PROPERTY[group]}-${name}: ${toVar(value)};`

// Links and focus read the brand directly, so only roles named for the accent move
const isAccent = ({ name }: Role): boolean => /(^|-)accent(-|$)/.test(name)

// Only a role that reads the brand scale moves to the accent's scale: text on
// a fill is white whatever the hue
const remap = (value: string, to: (step: string) => string): string => {
  const [, step] = reference(value).match(/^color\.primary\.(\d+)$/) ?? []
  return step ? to(step) : value
}

const TEXT_CONTRAST = 4.5

// White unless it misses the ratio on this fill, then whichever reads better
const inkOn = (fill: string, dark: string): string => {
  const white = getContrast('#fff', fill)
  if (white >= TEXT_CONTRAST) return '{color.white}'
  return getContrast(dark, fill) >= white ? DARK_INK : '{color.white}'
}

const accentScope = (selector: string, roles: Role[]): string =>
  `  ${selector} {\n    ${roles.map(declare).join('\n    ')}\n  }`

const lightAccent = (name: string): string => `[data-color-accent='${name}']`

// Descendant and same-element forms both outrank a light accent scope
const darkAccent = (name: string): string =>
  `${DARK} [data-color-accent='${name}'],\n  ${DARK}[data-color-accent='${name}']`

const readRoles = (file: string): Role[] => {
  const groups: Record<string, RoleGroup> = JSON.parse(readFileSync(file, 'utf-8'))
  return Object.entries(groups).flatMap(([group, tokens]) =>
    Object.entries(tokens).map(([name, { $value }]) => ({ group, name, value: $value }))
  )
}

export const buildRoles = (): void => {
  const root = process.cwd()
  const roles: Record<string, RoleGroup> = JSON.parse(
    readFileSync(join(root, 'src', 'roles', 'light.json'), 'utf-8')
  )

  const accents: Accents = JSON.parse(
    readFileSync(join(root, 'src', 'roles', 'accents.json'), 'utf-8')
  )

  const { color: colors }: {
    color: Record<string, Record<string, { $value: string }>>
  } = JSON.parse(
    readFileSync(join(root, 'src', 'properties', 'colors.json'), 'utf-8')
  )

  const list: Role[] = Object.entries(roles).flatMap(([group, tokens]) =>
    Object.entries(tokens).map(([name, { $value }]) => ({
      group,
      name,
      value: $value
    }))
  )
  const all = list.map(declare)
  const brands: Record<string, Record<string, string>> = JSON.parse(
    readFileSync(join(root, 'src', 'roles', 'brands.json'), 'utf-8')
  )
  const overridden = new Set(Object.values(brands).flatMap(Object.keys))
  const key = ({ group, name }: Role): string => `${group}.${name}`

  // A role one brand overrides is reset in every brand scope, so a brand
  // nested in another doesn't inherit the outer brand's value
  const brandOwned = list
    .filter(
      (role) =>
        BRAND_OWNED.test(reference(role.value)) || overridden.has(key(role))
    )
    .map(declare)

  const shadows: Record<string, string> = JSON.parse(
    readFileSync(join(root, 'src', 'roles', 'shadows.json'), 'utf-8')
  )
  // Outside @theme: Tailwind inlines theme shadows into its utilities, and
  // these have to stay variables so a scheme can change them
  const shadowScope = `  :root {\n    ${Object.entries(shadows)
    .map(([name, value]) => `--shadow-${name}: ${value};`)
    .join('\n    ')}\n  }`

  const themesPath = join(root, 'src', 'themes')
  const brandOverrides = Object.entries(brands).map(
    ([theme, own]) =>
      `  ${themeSelectors(themesPath, theme).join(',\n  ')} {\n    ${list
        .filter((role) => own[key(role)])
        .map((role) => declare({ ...role, value: own[key(role)] }))
        .join('\n    ')}\n  }`
  )
  const accentScopes = (
    roleList: Role[],
    selector: (name: string) => string,
    own: (tone: Accents['tones'][string]) => Record<string, string> | undefined
  ): string[] => {
    const accentRoles = roleList.filter(isAccent)
    return [
      accentScope(selector('brand'), accentRoles),
      ...accents.hues.map((hue) =>
        accentScope(
          selector(hue),
          accentRoles.map((role) => ({
            ...role,
            value: ON_FILL[role.name]
              ? inkOn(
                  colors[hue][ON_FILL[role.name]].$value,
                  colors.grey['1200'].$value
                )
              : remap(role.value, (step) => `{color.${hue}.${step}}`)
          }))
        )
      ),
      ...Object.entries(accents.tones).map(([tone, scale]) =>
        accentScope(
          selector(tone),
          accentRoles.map((role) => ({
            ...role,
            value:
              own(scale)?.[`${role.group}.${role.name}`] ??
              remap(
                role.value,
                (step) => scale.steps[step] ?? `{color.${scale.hue}.${step}}`
              )
          }))
        )
      )
    ]
  }

  const darkList = readRoles(join(root, 'src', 'roles', 'dark.json'))

  const scopes = ['[data-brand]', ...brandSelectors(themesPath)]

  // Repeated on every brand scope below it, which would otherwise reset the
  // brand-owned roles to their light values
  const darkScope = `  ${[DARK, ...scopes.map((scope) => `${DARK} ${scope}`)].join(',\n  ')} {
    color-scheme: dark;
    ${darkList.map(declare).join('\n    ')}
  }`

  // A custom property resolves var() where it is declared, so a brand set
  // below <html> (a PDF body, a preview) needs its own copy of these
  const css = `
@theme static {
  ${all.join('\n  ')}
}

@layer theme {
${shadowScope}

  ${scopes.join(',\n  ')} {
    ${brandOwned.join('\n    ')}
  }

${[
  ...brandOverrides,
  ...accentScopes(list, lightAccent, (tone) => tone.roles),
  darkScope,
  ...accentScopes(darkList, darkAccent, (tone) => tone.dark)
].join('\n\n')}
}
`

  writeFileSync(join(root, 'lib', 'roles.css'), css, 'utf-8')

  const names = {
    brands: Object.values(BRANDS),
    hues: accents.hues,
    tones: Object.keys(accents.tones),
    accents: ['brand', ...accents.hues, ...Object.keys(accents.tones)],
    roles: Object.fromEntries(
      Object.entries(roles).map(([group, tokens]) => [group, Object.keys(tokens)])
    ),
    shadows: Object.keys(shadows)
  }
  const literal = (value: unknown): string => JSON.stringify(value, null, 2)
  const union = (values: string[]): string =>
    values.map((value) => `'${value}'`).join(' | ')

  writeFileSync(
    join(root, 'lib', 'roles.js'),
    Object.entries(names)
      .map(([name, value]) => `export const ${name} = ${literal(value)}\n`)
      .join('\n'),
    'utf-8'
  )

  writeFileSync(
    join(root, 'lib', 'roles.d.ts'),
    `export type Brand = ${union(names.brands)}
export type ColorHue = ${union(names.hues)}
export type ColorTone = ${union(names.tones)}
export type ColorAccent = 'brand' | ColorHue | ColorTone

export type BackgroundColorRole = ${union(names.roles.background)}
export type TextColorRole = ${union(names.roles.text)}
export type BorderColorRole = ${union(names.roles.border)}
export type OutlineColorRole = ${union(names.roles.outline)}

export type ShadowRole = ${union(names.shadows)}
export type ShadowRoleVariable = \`--shadow-\${ShadowRole}\`

export type ColorRoleVariable =
  | \`--background-color-\${BackgroundColorRole}\`
  | \`--text-color-\${TextColorRole}\`
  | \`--border-color-\${BorderColorRole}\`
  | \`--outline-color-\${OutlineColorRole}\`

export declare const brands: Brand[]
export declare const hues: ColorHue[]
export declare const tones: ColorTone[]
export declare const accents: ColorAccent[]
export declare const shadows: ShadowRole[]
export declare const roles: {
  background: BackgroundColorRole[]
  text: TextColorRole[]
  border: BorderColorRole[]
  outline: OutlineColorRole[]
}
`,
    'utf-8'
  )
  console.log(`Wrote ${all.length} role tokens to lib/roles.css`)
}
