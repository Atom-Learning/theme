const fs = require('fs').promises

const readFile = async (path) => {
  try {
    const data = await fs.readFile(path, 'utf8')
    return data
  } catch (err) {
    console.log(err)
  }
}

const action = async (_, config) => {
  const files = config.files.map(
    (file) => `./${config.buildPath}${file.destination}`
  )
  const content = await Promise.all(files.map((path) => readFile(path)))

  const err = await fs.writeFile(
    `./${config.buildPath}/${config.name || 'index'}.scss`,
    content.join('\n')
  )

  if (err) {
    return console.error('file not written: ' + err)
  } else {
    await Promise.all(files.map((path) => fs.unlink(path)))
  }
}

module.exports = action
