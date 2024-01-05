const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const formatterSystemUiThemeTypes = require('../src/formatters/system-ui-theme-types')
const formatterSystemUiTheme = require('../src/formatters/system-ui-theme')
const formatterScssMapFlat = require('../src/formatters/scss-map-flat')
const actionMergeFiles = require('../src/actions/merge-files')
const config = require('../style.config')

const argv = yargs(hideBin(process.argv)).argv

const StyleDictionary = require('style-dictionary').extend(config(argv.theme))

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

StyleDictionary.buildAllPlatforms()
