const config = require('../style.config')
const StyleDictionary = require('style-dictionary').extend(config)

const formatterSystemUiThemeTypes = require('../src/formatters/system-ui-theme-types')
const formatterSystemUiTheme = require('../src/formatters/system-ui-theme')
const formatterScssMapFlat = require('../src/formatters/scss-map-flat')
const actionMergeFiles = require('../src/actions/merge-files')
const actionPrefixFile = require('../src/actions/prefix-file')

StyleDictionary.registerFormat({
  name: 'custom/format/system-ui-theme',
  formatter: formatterSystemUiTheme
})

StyleDictionary.registerFormat({
  name: 'custom/format/system-ui-theme-types',
  formatter: formatterSystemUiThemeTypes
})

StyleDictionary.registerFormat({
  name: 'custom/format/scss-map-flat',
  formatter: formatterScssMapFlat
})

StyleDictionary.registerAction({
  name: 'merge-files',
  do: actionMergeFiles,
  undo: () => null
})
StyleDictionary.registerAction({
  name: 'prefix-file',
  do: actionPrefixFile
})

StyleDictionary.registerTransform({
  name: 'scsslist',
  type: 'value',
  matcher: (token) => String(token.value).includes('/'),
  transformer: function (token) {
    const values = token.original.value.split('/')
    return `list.slash(${values})`
  }
})

StyleDictionary.buildAllPlatforms()
