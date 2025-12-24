interface BuildConfig {
  includeBase: boolean
  themePath: string | null
}

interface Property {
  filePath?: string
  [key: string]: unknown
}

let currentBuildConfig: BuildConfig = { includeBase: true, themePath: null }

export const setBuildConfig = (config?: BuildConfig | null): void => {
  currentBuildConfig = config || { includeBase: true, themePath: null }
}

export const getBuildConfig = (): BuildConfig => currentBuildConfig

export const shouldIncludeProperty = (property: Property, config?: BuildConfig | null): boolean => {
  if (config?.includeBase) return true
  if (config?.themePath) return (property.filePath || '').includes('src/themes/')
  return true
}

export const isBaseTheme = (config?: BuildConfig | null): boolean =>
  config?.includeBase === true && !config?.themePath

