import imageSize from 'image-size';
import ExifParser from 'exif-parser';
import { ImageMetadataAnalysis } from '@trustlens/shared';
import { ValidatedImageInput } from './image.types';

export class ImageMetadataService {
  /**
   * Safely extract structured metadata and EXIF signals from an image buffer
   * enforcing privacy shields on sensitive location coordinates.
   */
  extractMetadata(input: ValidatedImageInput): ImageMetadataAnalysis {
    let width = 0;
    let height = 0;

    // 1. Dimensions extraction
    try {
      const dimensions = imageSize(input.buffer);
      width = dimensions.width || 0;
      height = dimensions.height || 0;
    } catch {
      // Dimensions already checked in security layer
    }

    let cameraMake: string | null = null;
    let cameraModel: string | null = null;
    let timestamp: string | null = null;
    let hasLocationData = false;
    let exifFound = false;

    // 2. EXIF Parsing (primarily for JPEG, some WEBP)
    try {
      if (input.mimeType === 'image/jpeg') {
        const parser = ExifParser.create(input.buffer);
        const result = parser.parse();

        if (result && result.tags) {
          const tags = result.tags;
          exifFound = Object.keys(tags).length > 0;

          if (tags.Make && typeof tags.Make === 'string') {
            cameraMake = tags.Make.trim();
          }
          if (tags.Model && typeof tags.Model === 'string') {
            cameraModel = tags.Model.trim();
          }
          if (tags.DateTimeOriginal || tags.CreateDate || tags.ModifyDate) {
            const unixSec = tags.DateTimeOriginal || tags.CreateDate || tags.ModifyDate;
            if (unixSec && typeof unixSec === 'number') {
              timestamp = new Date(unixSec * 1000).toISOString();
            }
          }

          // PRIVACY SHIELD:
          // Detect whether GPS exists, but NEVER expose raw coordinates!
          if (
            (tags.GPSLatitude !== undefined && tags.GPSLatitude !== null) ||
            (tags.GPSLongitude !== undefined && tags.GPSLongitude !== null)
          ) {
            hasLocationData = true;
          }
        }
      }
    } catch {
      // EXIF parsing failure is non-fatal: images without EXIF are standard
    }

    const limitations: string[] = [
      'Metadata can be easily stripped, falsified, or modified by messaging apps and image re-encoders.',
      'Absence of EXIF metadata does not indicate an image is fabricated.',
    ];

    if (!exifFound) {
      limitations.push('No embedded EXIF header tags were detected in the uploaded file.');
    }

    return {
      metadataAvailable: exifFound || width > 0,
      signals: {
        mimeType: input.mimeType,
        width,
        height,
        sizeBytes: input.sizeBytes,
        cameraMake,
        cameraModel,
        timestamp,
        hasLocationData, // Coarse privacy-preserving flag only
      },
      limitations,
    };
  }
}

export const imageMetadataService = new ImageMetadataService();
