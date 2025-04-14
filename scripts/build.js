const dree = require('dree')
const path = require('node:path')
const yargs = require('yargs')

const formatterSystemUiThemeTypes = require('../src/formatters/system-ui-theme-types')
const formatterSystemUiTheme = require('../src/formatters/system-ui-theme')
const actionMergeFiles = require('../src/actions/merge-files')
const config = require('../style.config')

const argv = yargs(process.argv).argv

const buildTheme = (name, path) => {
  console.log(`\n> Building ${name} theme`)

  const StyleDictionary = require('style-dictionary').extend(config(name, path))

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

const isDir = (child) => child.type === 'directory'

const run = () => {
  const { children } = dree.scan(path.resolve(process.cwd(), argv.path), {
    size: false,
    sizeInBytes: false,
    hash: false,
    stat: false
  })

  for (const dir of children) {
    const name = dir.name

    // build root theme
    buildTheme(name)

    if (dir.children.some(isDir)) {
      for (const nestedDir of dir.children.filter(isDir)) {
        const nestedName = nestedDir.name

        buildTheme(`${name}-${nestedName}`, [name, nestedName])
      }
    }
  }
}

run()
