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
  - fourth level: `value`, the value the token will be replaced by.

  e.g.:
  ```json
  {
    "ratios": {
      "ratio": {
        "16-9": {
          "value": "16/9"
        },
        "3-2": {
          "value": "3/2"
        },
        "4-3": {
          "value": "4/3"
        },
        "1-1": {
          "value": "1/1"
        },
        "3-4": {
          "value": "3/4"
        }
      }
    }
  }
  ```

  * In `style.config.js` add your new category (if you added a new category) to the filter of the formatter `'custom/format/scss-map-flat'`. So it's treated the same way than `'size'` and `'effects'`

  * In `theme-map.js` add the (css property -> category) relation to `themeMap`, in this example, we added `aspectRatio: 'ratios'`. This `themeMap` config is exported and used by projects using our `theme` repo. It's used by `createStitches()` from `@stitches/react` so that we don't have to reference the `type`, so we can call the token like `'$16-9'` instead of `'$ratios$16-9'`
