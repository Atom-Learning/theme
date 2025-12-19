import { promises as fs } from 'fs'
import { join } from 'path'
import { copyFile, mkdir } from 'fs/promises'

interface Config {
  buildPath: string
}

const copyDirectory = async (src: string, dest: string): Promise<void> => {
  try {
    await fs.access(src)
  } catch {
    console.log(`Source directory ${src} does not exist, skipping`)
    return
  }

  const entries = await fs.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)

    if (entry.isDirectory()) {
      await mkdir(destPath, { recursive: true })
      await copyDirectory(srcPath, destPath)
    } else {
      await copyFile(srcPath, destPath)
    }
  }
}

const action = async (_: unknown, config: Config): Promise<void> => {
  const srcAssets = join(process.cwd(), 'src', 'assets')
  const destAssets = join(process.cwd(), config.buildPath, 'assets')

  try {
    await mkdir(destAssets, { recursive: true })
    await copyDirectory(srcAssets, destAssets)
    console.log(`Copied assets from ${srcAssets} to ${destAssets}`)
  } catch (error) {
    console.error('Error copying assets:', error)
    throw error
  }
}

export default action

