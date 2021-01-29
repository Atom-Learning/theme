const config = require('../style.config')
const StyleDictionary = require('style-dictionary').extend(config)

const formatterSystemUiTheme = require('../src/formatters/system-ui-theme')
const formatterScssMapFlat = require('../src/formatters/scss-map-flat')
const actionMergeFiles = require('../src/actions/merge-files')

StyleDictionary.registerFormat({
  name: 'custom/format/system-ui-theme',
  formatter: formatterSystemUiTheme
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

StyleDictionary.buildAllPlatforms()
