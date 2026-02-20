// Jest mock for expo-file-system API compatible with fs-shim usage
// In-memory store for files and directories
const store: Map<string, { type: 'file' | 'dir'; content?: string; mtime?: number }> = new Map();

export const documentDirectory = 'jest://document';
export const cacheDirectory = 'jest://cache';

export async function getInfoAsync(path: string): Promise<any> {
  const meta = store.get(path);
  if (!meta) return { exists: false };
  if (meta.type === 'dir') return { exists: true, isDirectory: true };
  return {
    exists: true,
    isDirectory: false,
    size: meta.content?.length ?? 0,
    modificationTime: meta.mtime ?? Date.now(),
  };
}

export async function makeDirectoryAsync(path: string, _opts?: { intermediates?: boolean }): Promise<void> {
  store.set(path, { type: 'dir' });
}

export async function deleteAsync(path: string, _opts?: { idempotent?: boolean }): Promise<void> {
  store.delete(path);
}

export async function readDirectoryAsync(path: string): Promise<string[]> {
  const prefix = path.endsWith('/') ? path : `${path}/`;
  const names: string[] = [];
  for (const [p, meta] of store.entries()) {
    if (!p.startsWith(prefix)) continue;
    const name = p.substring(prefix.length);
    if (!name || name.includes('/')) continue;
    names.push(name);
  }
  return names;
}

export async function writeAsStringAsync(path: string, data: string, _opts?: { encoding?: any }): Promise<void> {
  store.set(path, { type: 'file', content: String(data), mtime: Date.now() });
}

export async function readAsStringAsync(path: string): Promise<string> {
  const meta = store.get(path);
  return meta?.content ?? '';
}

export async function copyAsync(opts: { from: string; to: string }): Promise<void> {
  const meta = store.get(opts.from);
  if (meta) store.set(opts.to, { ...meta, mtime: Date.now() });
}

export async function downloadAsync(url: string, destPath: string): Promise<{ uri: string }> {
  store.set(destPath, { type: 'file', content: `downloaded:${url}`, mtime: Date.now() });
  return { uri: destPath };
}
