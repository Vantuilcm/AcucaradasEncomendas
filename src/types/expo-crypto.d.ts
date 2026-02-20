declare module 'expo-crypto' {
  export enum CryptoDigestAlgorithm {
    SHA1 = 'SHA-1',
    SHA256 = 'SHA-256',
    SHA384 = 'SHA-384',
    SHA512 = 'SHA-512',
    MD2 = 'MD2',
    MD4 = 'MD4',
    MD5 = 'MD5',
  }

  export function digestStringAsync(
    algorithm: CryptoDigestAlgorithm,
    data: string
  ): Promise<string>;

  export function getRandomValues(array: Uint8Array): Uint8Array;
}
