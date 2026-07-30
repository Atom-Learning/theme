# theme

These repository contains the Atom Learning Design System tokens, like colours, sizes, spaces, font families and so on.

## How to add new tokens that are not part of the theme specification

If you need to add tokens that are not part of the [theme specification](https://github.com/system-ui/theme-specification#key-reference), follow the instruction below. You can also have a look at [this PR](https://github.com/Atom-Learning/theme/pull/25) where we did it for aspect ratios.

* In `system-ui-theme.js`, in `schema` add a new field as an empty object, like `ratios: {}`
* Also in `system-ui-theme.js`, in `matchSchema`, add a new field named `[category].[type]`, which value references the field you added to `schema` in the previous step. For example if the category is ratios, and the type is ratio, it would look like `'ratios.ratio': 'ratios`
* Depending on what you are adding you might have to add it to an existing .json file or create a new one. In our example, we created a new one `src/properties/ratios.json`, and added all our tokens there. The json structure is as follow
  - first level: the `category` mentioned in the step above
  - second level: the `type` mentioned in the step above
  - third level: the token name, as you would use it with `$`, e.g.: `$16-9`
  - fourth level: `$value`, the value the token will be replaced by (token sources use the [DTCG format](https://tr.designtokens.org/format/); groups may also declare a `$type`).

  e.g.:
  ```json
  {
    "ratios": {
      "ratio": {
        "16-9": {
          "$value": "16/9"
        },
        "3-2": {
          "$value": "3/2"
        },
        "4-3": {
          "$value": "4/3"
        },
        "1-1": {
          "$value": "1/1"
        },
        "3-4": {
          "$value": "3/4"
        }
      }
    }
  }
  ```

  * In `style.config.js` add your new category (if you added a new category) to the filter of the formatter `'custom/format/scss-map-flat'`. So it's treated the same way than `'size'` and `'effects'`

  * In `theme-map.js` add the (css property -> category) relation to `themeMap`, in this example, we added `aspectRatio: 'ratios'`. This `themeMap` config is exported and used by projects using our `theme` repo. It's used by `createStitches()` from `@stitches/react` so that we don't have to reference the `type`, so we can call the token like `'$16-9'` instead of `'$ratios$16-9'`

### How is `themeMap` used?

For example, in `components` repo we use it like this:

```
...
import { createStitches, defaultThemeMap } from '@stitches/react'
import { themeMap } from '@atom-learning/theme/theme-map'

...

const stitchesConfig = createStitches({
  theme: atomTheme as Theme,
  themeMap: {
    ...defaultThemeMap,
    ...themeMap
  },
  utils,
  media
})
```

### Why/When do we need `themeMap`?
Some CSS properties are not included in the [defaultThemeMap](https://stitches.dev/docs/api#defaultthememap). If they are missing (e.g.: aspectRatio) you need to add them to our custom `themeMap` which we pass to stitches [themeMap](https://stitches.dev/docs/api#thememap) config

## Native outputs (Swift & Kotlin)

Alongside the web outputs, the build emits the tokens in native-consumable form for the iOS and Android apps:

- `lib/theme-*.swift` — a `ThemeTokens` enum of SwiftUI `Color(red:green:blue:opacity:)` and `CGFloat` constants (style-dictionary's `ios-swift/enum.swift` format)
- `lib/theme-*.kt` — the equivalent Compose `Color(0xAARRGGBB)`, `.sp`/`.dp` constants in `package uk.co.atomlearning.theme` (style-dictionary's `compose/object` format)

Values are converted at build time by style-dictionary's built-in transforms (`color/ColorSwiftUI`, `color/composeColor`, `size/swift/remToCGFloat`, `size/compose/remToSp`, `size/compose/remToDp`), driven by the `$type` declared on each token group: colours from hsl()/hex to sRGB components, `size.font`/`size.radii`/`size.space` from rem to pt (× 16). `size.leading` has no transform on purpose — the multipliers pass through unitless. Constant names come from the custom `name/native/camel` transform in `src/native.ts`: flat camelCase from the token path (`color.blue.800` → `blue800`, `size.font.sm` → `fontSm`) — **renames are breaking** for the native apps.

Deliberately excluded: `font.families.*` (web font stacks — the apps bundle their own fonts), `size.breakpoint.*` (windowed-web concern) and `effects.*` (CSS box-shadow strings don't translate to native shadow parameters).

The files ship inside the npm tarball; the native repos vendor the file for a pinned version (e.g. fetched from unpkg in their build). There is no Swift Package or Maven artifact.

## Testing

`yarn test` (watch) and `yarn test:run` (single run) both build first via a `pretest` hook, so the suite never asserts against stale `lib/` output. CI runs the same suite on every PR (`.github/workflows/ci.yml`), plus `yarn validate:types`.

The suite is output-focused — it builds the package and inspects the real artifacts in `lib/`:

- `test/theme.test.ts` — JS / CSS / `.d.ts` / media query structure and formatting
- `test/completeness.test.ts` — reconciles the token sources against every output, so a filter or naming regression that silently drops tokens fails the build
- `test/values.test.ts` — exact values for shadows, breakpoints and font stacks, and cross-output consistency (Swift colours are re-derived from the source hsl and checked against the JS theme and the Kotlin output)
- `test/native.test.ts` — Swift/Kotlin structure, conversions and per-theme filtering
- `test/native-compile.test.ts` — compiles the generated files with `swiftc` and `kotlinc`. These tests **skip when the toolchain is absent**, so a local run without Xcode or Kotlin still passes; the macOS CI job installs both so they always execute there
- `test/assets.test.ts` — every `package.json` export target, `typesVersions` path and copied asset exists and is non-empty

One known failure is encoded as an expected failure (`it.fails`) in `test/completeness.test.ts`: the CSS formatters emit `--color-coolGrey-100` while the JS/`.d.ts` `properties` map declares `--color-cool-grey-100`, so `var(--color-cool-grey-100)` resolves to nothing. This predates the native outputs work; remove the `.fails` marker when the naming is reconciled.
