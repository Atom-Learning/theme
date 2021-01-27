const config = require('../style.config')
const StyleDictionary = require('style-dictionary').extend(config)

const formatterSystemUiTheme = require('../src/formatters/system-ui-theme')
const formatterScssMapFlat = require('../src/formatters/scss-map-flat')

StyleDictionary.registerFormat({
  name: 'custom/format/system-ui-theme',
  formatter: formatterSystemUiTheme
})

StyleDictionary.registerFormat({
  name: 'custom/format/scss-map-flat',
  formatter: formatterScssMapFlat
})

StyleDictionary.buildAllPlatforms()
