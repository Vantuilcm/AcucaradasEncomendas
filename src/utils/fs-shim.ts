import * as FileSystem from 'expo-file-system'

export const Paths = {
  document: FileSystem.documentDirectory || '',
  cache: FileSystem.cacheDirectory || ''
}

export class Directory {
  root: string
  name: string
  private _exists = false
  private _entries: File[] = []
  constructor(root: string, name?: string) {
    const r = root.endsWith('/') ? root : root + '/'
    this.root = r
    this.name = name ?? ''
  }
  get path() {
    return this.root + this.name
  }
  get uri() {
    return this.path
  }
  get exists() {
    return this._exists
  }
  async refresh() {
    const info = await FileSystem.getInfoAsync(this.path)
    this._exists = !!info.exists && info.isDirectory === true
    return this._exists
  }
  async create(opts?: { intermediates?: boolean; idempotent?: boolean }) {
    await FileSystem.makeDirectoryAsync(this.path, { intermediates: opts?.intermediates ?? true })
    this._exists = true
  }
  async delete() {
    await FileSystem.deleteAsync(this.path, { idempotent: true })
    this._exists = false
  }
  list() {
    return this._entries
  }
  async refreshList() {
    const names = await FileSystem.readDirectoryAsync(this.path)
    this._entries = names.map((n) => new File(this, n))
    return this._entries
  }
}

export class File {
  path: string
  size?: number
  modificationTime?: number
  creationTime?: number
  constructor(pathOrDir: string | Directory, name?: string) {
    this.path = typeof pathOrDir === 'string' ? pathOrDir : pathOrDir.path + '/' + (name || '')
  }
  get uri() {
    return this.path
  }
  async writeString(data: string) {
    await FileSystem.writeAsStringAsync(this.path, data)
    await this.refresh()
  }
  async write(data: string, opts?: { encoding?: any }) {
    await FileSystem.writeAsStringAsync(this.path, data, { encoding: opts?.encoding })
    await this.refresh()
  }
  async readString() {
    return FileSystem.readAsStringAsync(this.path)
  }
  exists = false
  async refresh() {
    const info = await FileSystem.getInfoAsync(this.path)
    this.exists = !!info.exists && info.isDirectory !== true
    this.size = typeof (info as any).size === 'number' ? (info as any).size : undefined
    this.modificationTime = typeof (info as any).modificationTime === 'number' ? (info as any).modificationTime : undefined
    this.creationTime = this.modificationTime ?? undefined
    return this.exists
  }
  async create(_opts?: { overwrite?: boolean }) {
    await FileSystem.writeAsStringAsync(this.path, '')
    await this.refresh()
  }
  async delete() {
    await FileSystem.deleteAsync(this.path, { idempotent: true })
    this.exists = false
  }
  async copy(dest: File) {
    await FileSystem.copyAsync({ from: this.path, to: dest.path })
    await dest.refresh()
  }
  static async downloadFileAsync(url: string, dest: File, _opts?: { idempotent?: boolean }) {
    const result = await FileSystem.downloadAsync(url, dest.path)
    await dest.refresh()
    return { uri: result.uri }
  }
}
