const dree = require('dree')
const path = require('node:path')
const yargs = require('yargs')

const formatterSystemUiThemeTypes = require('../src/formatters/system-ui-theme-types')
const formatterSystemUiTheme = require('../src/formatters/system-ui-theme')
const actionMergeFiles = require('../src/actions/merge-files')
const config = require('../style.config')

const argv = yargs(process.argv).argv

const buildTheme = (themes) => {
  console.log(`\n> Building ${themes.join('-')} theme`)

  const StyleDictionary = require('style-dictionary').extend(config(themes))

  StyleDictionary.registerFormat({
    name: 'custom/format/system-ui-theme',
    formatter: formatterSystemUiTheme
  })

  StyleDictionary.registerFormat({
    name: 'custom/format/system-ui-theme-types',
    formatter: formatterSystemUiThemeTypes
  })

  StyleDictionary.registerAction({
    name: 'merge-files',
    do: actionMergeFiles,
    undo: () => null
  })

  StyleDictionary.buildAllPlatforms()
}

const buildNestedTheme = (directories, children) => {
  // build theme from directory
  buildTheme(directories)

  // loop through nested themes
  for (const dir of children.filter((child) => child.type === 'directory')) {
    buildNestedTheme([...directories, dir.name], dir.children)
  }
}

const run = () => {
  const { children } = dree.scan(path.resolve(process.cwd(), argv.path), {
    size: false,
    sizeInBytes: false,
    hash: false,
    stat: false
  })

  for (const dir of children) {
    buildNestedTheme([dir.name], dir.children)
  }
}

run()
