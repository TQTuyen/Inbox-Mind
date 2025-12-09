import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Request } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

/**
 * Multer Configuration for Email Attachments
 * Implements secure file upload with validation and memory management
 */

// File upload limits
export const FILE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB per file
  MAX_FILES: 10, // Maximum 10 files per request
  MAX_TOTAL_SIZE: 50 * 1024 * 1024, // 50MB total for all files
} as const;

// Allowed MIME types for security
export const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/html',
  'application/json',
  'application/xml',

  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'image/webp',
  'image/x-icon',

  // Archives
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',

  // Media
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',

  // Others
  'application/octet-stream',
] as const;

// Allowed file extensions
export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.html',
  '.json',
  '.xml',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.svg',
  '.webp',
  '.ico',
  '.zip',
  '.rar',
  '.7z',
  '.tar',
  '.gz',
  '.mp3',
  '.mp4',
  '.avi',
  '.mov',
  '.wav',
] as const;

/**
 * Validates file type by MIME type and extension
 */
export function fileFilter(
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void
): void {
  // Check MIME type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
    return callback(
      new BadRequestException(
        `File type not allowed: ${
          file.mimetype
        }. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      ),
      false
    );
  }

  // Check file extension
  const ext = extname(file.originalname).toLowerCase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!ALLOWED_EXTENSIONS.includes(ext as any)) {
    return callback(
      new BadRequestException(
        `File extension not allowed: ${ext}. Allowed extensions: ${ALLOWED_EXTENSIONS.join(
          ', '
        )}`
      ),
      false
    );
  }

  // Accept the file
  callback(null, true);
}

/**
 * Generates unique filename with timestamp and random string
 */
export function generateFilename(
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, filename: string) => void
): void {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = extname(file.originalname);
  const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
  callback(null, filename);
}

/**
 * Ensures upload directory exists
 */
export function ensureUploadDir(uploadPath: string): void {
  if (!existsSync(uploadPath)) {
    mkdirSync(uploadPath, { recursive: true });
  }
}

/**
 * Memory Storage Configuration
 * Best for small files that will be processed immediately
 * Files are stored in memory as Buffer objects
 */
export const memoryStorageConfig: MulterOptions = {
  storage: undefined, // Uses default memory storage
  fileFilter: fileFilter,
  limits: {
    fileSize: FILE_UPLOAD_LIMITS.MAX_FILE_SIZE,
    files: FILE_UPLOAD_LIMITS.MAX_FILES,
  },
};

/**
 * Disk Storage Configuration
 * Best for larger files or when files need to persist temporarily
 * Files are stored on disk in the specified directory
 */
export function createDiskStorageConfig(uploadDir: string): MulterOptions {
  const uploadPath = join(process.cwd(), uploadDir);
  ensureUploadDir(uploadPath);

  return {
    storage: diskStorage({
      destination: uploadPath,
      filename: generateFilename,
    }),
    fileFilter: fileFilter,
    limits: {
      fileSize: FILE_UPLOAD_LIMITS.MAX_FILE_SIZE,
      files: FILE_UPLOAD_LIMITS.MAX_FILES,
    },
  };
}

/**
 * Stream Storage Configuration (Recommended for Gmail API)
 * Processes files as streams without storing them
 * Most memory-efficient approach
 */
export const streamStorageConfig: MulterOptions = {
  storage: undefined, // Memory storage for streaming
  fileFilter: fileFilter,
  limits: {
    fileSize: FILE_UPLOAD_LIMITS.MAX_FILE_SIZE,
    files: FILE_UPLOAD_LIMITS.MAX_FILES,
  },
  // Preserve original filename for Gmail
  preservePath: false,
};

/**
 * Default configuration for email attachments
 * Uses memory storage for immediate processing
 */
export const emailAttachmentConfig: MulterOptions = memoryStorageConfig;
