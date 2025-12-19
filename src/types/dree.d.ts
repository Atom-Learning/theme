declare module 'dree' {
  interface ScanOptions {
    size?: boolean
    sizeInBytes?: boolean
    hash?: boolean
    stat?: boolean
  }

  interface DreeChild {
    type: 'directory' | 'file'
    name: string
    children?: DreeChild[]
  }

  interface ScanResult {
    children: DreeChild[]
  }

  export function scan(path: string, options?: ScanOptions): ScanResult
}

