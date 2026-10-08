declare module 'exif-parser' {
  export interface ExifTags {
    Make?: string;
    Model?: string;
    DateTimeOriginal?: number;
    CreateDate?: number;
    ModifyDate?: number;
    GPSLatitude?: number;
    GPSLongitude?: number;
    GPSAltitude?: number;
    Orientation?: number;
    Software?: string;
    [key: string]: any;
  }

  export interface ExifResult {
    startMarker?: any;
    tags: ExifTags;
    imageSize?: {
      width: number;
      height: number;
    };
  }

  export interface ExifParserInstance {
    enableBinaryFields(enable: boolean): ExifParserInstance;
    enablePointers(enable: boolean): ExifParserInstance;
    enableTagNames(enable: boolean): ExifParserInstance;
    enableImageSize(enable: boolean): ExifParserInstance;
    enableReturnTags(enable: boolean): ExifParserInstance;
    parse(): ExifResult;
  }

  export function create(buffer: Buffer): ExifParserInstance;
}
