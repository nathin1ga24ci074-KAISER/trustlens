import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
    files: 1,
  },
});

export const imageUploadMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  upload.single('image')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          success: false,
          errorCode: 'IMAGE_TOO_LARGE',
          message: 'Image size exceeds maximum allowable limit of 10MB.',
        });
        return;
      }
      res.status(400).json({
        success: false,
        errorCode: 'IMAGE_INVALID_TYPE',
        message: err.message || 'Error occurred during image upload processing.',
      });
      return;
    }
    next();
  });
};
