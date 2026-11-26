// Dark scales: Radix's dark lightness and chroma curve, with each hue's own
// colour (its light step 800) on step 9. Run `node src/dark-scales.ts --write`
// to regenerate the JSON the build reads.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseToRgba } from 'color2k'

type Rgb = [number, number, number]
type Lch = [number, number, number]

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
const toGamma = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055

const toRgb = (color: string): Rgb => {
  const [r, g, b] = parseToRgba(color)
  return [r / 255, g / 255, b / 255]
}

const toHex = (rgb: number[]) =>
  `#${rgb
    .map((c) =>
      Math.round(Math.min(1, Math.max(0, c)) * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`

// Björn Ottosson's OKLab, in polar form
export const toOklch = (color: string): Lch => {
  const [r, g, b] = toRgb(color).map(toLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360]
}

const oklchToLinear = ([L, C, H]: Lch): Rgb => {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ]
}

// The most saturated in-gamut colour at this lightness and hue, up to C
const fromOklch = ([L, C, H]: Lch) => {
  const inGamut = (c: number) =>
    oklchToLinear([L, c, H]).every((v) => v >= -1e-4 && v <= 1 + 1e-4)
  let chroma = C
  if (!inGamut(chroma)) {
    let lo = 0
    let hi = C
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (inGamut(mid)) lo = mid
      else hi = mid
    }
    chroma = lo
  }
  return toHex(oklchToLinear([L, chroma, H]).map(toGamma))
}

/**
 * A dark scale with the reference's lightness on every step, and the colour's
 * hue and chroma, shaped by the reference's chroma curve
 */
export const generateScale = (color: string, reference: string[]) => {
  const ref = reference.map(toOklch)
  const [, cC, cH] = toOklch(color)
  // A grey colour stays neutral whatever the reference's tint
  const scale = cC < 0.005 ? 0 : cC / (ref[8][1] || 1)
  // Radix's bright hues (lime, yellow) glow at steps 9-10, past step 11; ours
  // are deeper, so those steps sit evenly between 8 and 11 instead
  const lightness = ref.map(([L]) => L)
  if (lightness[9] >= lightness[10]) {
    const [from, to] = [lightness[7], lightness[10]]
    lightness[8] = from + (to - from) / 3
    lightness[9] = from + ((to - from) * 2) / 3
  }
  // Step 9 is solid's hover in dark; Radix's jump from 8 makes hover glare, so
  // its lightness and chroma sit a third of the way from 8 to 10
  lightness[8] = lightness[7] + (lightness[9] - lightness[7]) / 3
  const chroma = ref.map(([, C]) => C)
  chroma[8] = chroma[7] + (chroma[9] - chroma[7]) / 3
  return chroma.map((C, i) => fromOklch([lightness[i], C * scale, cH]))
}

const luminance = (color: string) => {
  const [r, g, b] = toRgb(color).map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/** Problems with a dark scale, or [] when it passes */
export const checkScale = (name: string, steps: string[]) => {
  const problems: string[] = []
  const lightness = steps.map((step) => toOklch(step)[0])
  for (let i = 1; i < steps.length; i++) {
    if (lightness[i] <= lightness[i - 1])
      problems.push(`${name}: step ${i + 1} is not lighter than step ${i}`)
  }
  if (contrast(steps[10], steps[1]) < 4.5)
    problems.push(`${name}: step 11 on step 2 is below 4.5:1`)
  if (contrast(steps[11], steps[1]) < 7)
    problems.push(`${name}: step 12 on step 2 is below 7:1`)
  return problems
}

// Radix Colors dark scales, steps 1-12
export const RADIX_DARK: Record<string, string[]> = {
  gray: ['#111111', '#191919', '#222222', '#2a2a2a', '#313131', '#3a3a3a', '#484848', '#606060', '#6e6e6e', '#7b7b7b', '#b4b4b4', '#eeeeee'],
  blue: ['#0d1520', '#111927', '#0d2847', '#003362', '#004074', '#104d87', '#205d9e', '#2870bd', '#0090ff', '#3b9eff', '#70b8ff', '#c2e6ff'],
  pink: ['#191117', '#21121d', '#37172f', '#4b143d', '#591c47', '#692955', '#833869', '#a84885', '#d6409f', '#de51a8', '#ff8dcc', '#fdd1ea'],
  grass: ['#0e1511', '#141a15', '#1b2a1e', '#1d3a24', '#25482d', '#2d5736', '#366740', '#3e7949', '#46a758', '#53b365', '#71d083', '#c2f0c2'],
  green: ['#0e1512', '#121b17', '#132d21', '#113b29', '#174933', '#20573e', '#28684a', '#2f7c57', '#30a46c', '#33b074', '#3dd68c', '#b1f1cb'],
  red: ['#191111', '#201314', '#3b1219', '#500f1c', '#611623', '#72232d', '#8c333a', '#b54548', '#e5484d', '#ec5d5e', '#ff9592', '#ffd1d9'],
  purple: ['#18111b', '#1e1523', '#301c3b', '#3d224e', '#48295c', '#54346b', '#664282', '#8457aa', '#8e4ec6', '#9a5cd0', '#d19dff', '#ecd9fa'],
  cyan: ['#0b161a', '#101b20', '#082c36', '#003848', '#004558', '#045468', '#12677e', '#11809c', '#00a2c7', '#23afd0', '#4ccce6', '#b6ecf7'],
  teal: ['#0d1514', '#111c1b', '#0d2d2a', '#023b37', '#084843', '#145750', '#1c6961', '#207e73', '#12a594', '#0eb39e', '#0bd8b6', '#adf0dd'],
  plum: ['#181118', '#201320', '#351a35', '#451d47', '#512454', '#5e3061', '#734079', '#92549c', '#ab4aba', '#b658c4', '#e796f3', '#f4d4f4'],
  lime: ['#11130c', '#151a10', '#1f2917', '#29371d', '#334423', '#3d522a', '#496231', '#577538', '#bdee63', '#d4ff70', '#bde56c', '#e3f7ba'],
  indigo: ['#11131f', '#141726', '#182449', '#1d2e62', '#253974', '#304384', '#3a4f97', '#435db1', '#3e63dd', '#5472e4', '#9eb1ff', '#d6e1ff'],
  ruby: ['#191113', '#1e1517', '#3a141e', '#4e1325', '#5e1a2e', '#6f2539', '#883447', '#b3445a', '#e54666', '#ec5a72', '#ff949d', '#fed2e1'],
  jade: ['#0d1512', '#121c18', '#0f2e22', '#0b3b2c', '#114837', '#1b5745', '#246854', '#2a7e68', '#29a383', '#27b08b', '#1fd8a4', '#adf0d4'],
  yellow: ['#14120b', '#1b180f', '#2d2305', '#362b00', '#433500', '#524202', '#665417', '#836a21', '#ffe629', '#ffff57', '#f5e147', '#f6eeb4'],
  amber: ['#16120c', '#1d180f', '#302008', '#3f2700', '#4d3000', '#5c3d05', '#714f19', '#8f6424', '#ffc53d', '#ffd60a', '#ffca16', '#ffe7b3'],
  orange: ['#17120e', '#1e160f', '#331e0b', '#462100', '#562800', '#66350c', '#7e451d', '#a35829', '#f76b15', '#ff801f', '#ffa057', '#ffe0c2']
}

// Each of our hues and the Radix scale whose curve it follows
export const REFERENCES: Record<string, string> = {
  grey: 'gray',
  blue: 'blue',
  pink: 'pink',
  marsh: 'grass',
  green: 'green',
  red: 'red',
  orange: 'orange',
  purple: 'purple',
  cyan: 'cyan',
  teal: 'teal',
  magenta: 'plum',
  lime: 'lime',
  lapis: 'indigo',
  maroon: 'ruby',
  emerald: 'jade',
  yellow: 'yellow'
}

export const STEPS = ['100', '200', '300', '400', '500', '600', '700', '800', '900', '1000', '1100', '1200']

type Colors = Record<string, Record<string, { $value: string }>>

const resolve = (colors: Colors, value: string): string => {
  const match = value.match(/^\{color\.([\w]+)\.([\w]+)\}$/)
  return match ? resolve(colors, colors[match[1]][match[2]].$value) : value
}

export const darkScales = (root = process.cwd()) => {
  const { color: colors }: { color: Colors } = JSON.parse(
    readFileSync(join(root, 'src', 'properties', 'colors.json'), 'utf-8')
  )
  return Object.fromEntries(
    Object.entries(REFERENCES).map(([hue, reference]) => [
      hue,
      generateScale(resolve(colors, colors[hue]['800'].$value), RADIX_DARK[reference])
    ])
  )
}

export const toTokens = (scales: Record<string, string[]>) => ({
  color: {
    $type: 'color',
    ...Object.fromEntries(
      Object.entries(scales).map(([hue, steps]) => [
        `dark-${hue}`,
        Object.fromEntries(steps.map((value, i) => [STEPS[i], { $value: value }]))
      ])
    )
  }
})

// A brand's dark primary scale: atom's is blue's, the others are generated
// from the brand's solid colour
export const BRANDS: Record<string, { hue: string } | { solid: string; reference: string }> = {
  atom: { hue: 'blue' },
  'atom-school': { solid: '{color.blue.1000}', reference: 'indigo' },
  quest: { solid: 'hsl(162, 69%, 28%)', reference: 'jade' }
}

export const brandScale = (brand: string, root = process.cwd()) => {
  const source = BRANDS[brand]
  if ('hue' in source)
    return STEPS.map((step) => `{color.dark-${source.hue}.${step}}`)
  const { color: colors }: { color: Colors } = JSON.parse(
    readFileSync(join(root, 'src', 'properties', 'colors.json'), 'utf-8')
  )
  return generateScale(resolve(colors, source.solid), RADIX_DARK[source.reference])
}

const writeBrand = (brand: string, root = process.cwd()) => {
  const file = join(root, 'src', 'themes', brand, 'color.json')
  const tokens = JSON.parse(readFileSync(file, 'utf-8'))
  delete tokens.color.dark
  tokens.color['dark-primary'] = Object.fromEntries(
    brandScale(brand, root).map((value, i) => [STEPS[i], { $value: value }])
  )
  writeFileSync(file, `${JSON.stringify(tokens, null, 2)}\n`)
}

if (process.argv.includes('--write')) {
  Object.keys(BRANDS).forEach((brand) => writeBrand(brand))
  const scales = darkScales()
  const problems = Object.entries(scales).flatMap(([hue, steps]) => checkScale(hue, steps))
  if (problems.length) console.warn(problems.join('\n'))
  writeFileSync(
    join(process.cwd(), 'src', 'properties', 'colors-dark.json'),
    `${JSON.stringify(toTokens(scales), null, 2)}\n`
  )
  console.log(`Wrote ${Object.keys(scales).length} dark scales`)
}
