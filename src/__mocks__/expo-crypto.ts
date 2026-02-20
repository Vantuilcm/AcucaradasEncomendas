// Jest mock for expo-crypto
import { createHash } from 'crypto';

export enum CryptoDigestAlgorithm {
  SHA256 = 'SHA-256',
  SHA1 = 'SHA-1',
}

export async function digestStringAsync(algorithm: CryptoDigestAlgorithm | string, data: string): Promise<string> {
  const algo = typeof algorithm === 'string' ? algorithm : (algorithm === CryptoDigestAlgorithm.SHA256 ? 'sha256' : 'sha1');
  try {
    return createHash(algo).update(data).digest('hex');
  } catch {
    // Fallback to simple prefix if algo unsupported
    return `digest(${algo}):` + data;
  }
}
