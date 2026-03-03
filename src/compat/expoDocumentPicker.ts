export type DocumentPickerAsset = {
  uri: string;
  name?: string;
  size?: number;
  mimeType?: string;
};

export type DocumentPickerResult = {
  canceled: boolean;
  assets: DocumentPickerAsset[];
};

export async function getDocumentAsync(): Promise<DocumentPickerResult> {
  return { canceled: true, assets: [] };
}
