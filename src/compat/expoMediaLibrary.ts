export type Asset = {
  uri: string;
  width: number;
  height: number;
  mediaType: 'photo' | 'video' | string;
  creationTime: number;
  modificationTime: number;
  exif?: Record<string, any>;
};
