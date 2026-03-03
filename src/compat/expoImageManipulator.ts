export enum SaveFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
}

export type Action = Record<string, any>;

type ManipulateOptions = {
  compress?: number;
  format?: SaveFormat | string;
  base64?: boolean;
};

export async function manipulateAsync(
  uri: string,
  _actions: Action[] = [],
  options: ManipulateOptions = {}
): Promise<{ uri: string; base64?: string }> {
  if (options.base64) {
    return { uri, base64: '' };
  }
  return { uri };
}
