import { BadRequestException, Injectable } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { FILE_UPLOAD_LIMITS } from '../../../common/config/multer.config';
import { AppLoggerService } from '../../../common/logger/app-logger.service';

/**
 * Processed file metadata
 */
export interface ProcessedFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

/**
 * File Upload Service
 * Handles file processing, validation, and cleanup for email attachments
 * Implements streaming and memory-efficient file handling
 */
@Injectable()
export class FileUploadService {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('FileUploadService');
  }

  /**
   * Processes uploaded files from multipart/form-data
   * Validates size and converts to format suitable for Gmail API
   * @param files - Array of uploaded files from Multer
   * @returns Array of processed file metadata with buffers
   */
  async processUploadedFiles(
    files: Express.Multer.File[]
  ): Promise<ProcessedFile[]> {
    if (!files || files.length === 0) {
      return [];
    }

    this.logger.info(
      {
        fileCount: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
      },
      'Processing uploaded files'
    );

    // Validate total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE) {
      throw new BadRequestException(
        `Total file size (${totalSize} bytes) exceeds maximum allowed size (${FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE} bytes)`
      );
    }

    // Process each file
    const processedFiles: ProcessedFile[] = [];

    for (const file of files) {
      try {
        const processed = await this.processSingleFile(file);
        processedFiles.push(processed);
      } catch (error) {
        this.logger.error(
          {
            filename: file.originalname,
            error: error.message,
          },
          'Failed to process file'
        );

        // Clean up any files processed so far
        await this.cleanupFiles(files);

        throw error;
      }
    }

    this.logger.info(
      {
        processedCount: processedFiles.length,
        filenames: processedFiles.map((f) => f.filename),
      },
      'Successfully processed all files'
    );

    return processedFiles;
  }

  /**
   * Processes a single uploaded file
   * @param file - Multer file object
   * @returns Processed file metadata
   */
  private async processSingleFile(
    file: Express.Multer.File
  ): Promise<ProcessedFile> {
    // Validate file size
    if (file.size > FILE_UPLOAD_LIMITS.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File "${file.originalname}" size (${file.size} bytes) exceeds maximum allowed size (${FILE_UPLOAD_LIMITS.MAX_FILE_SIZE} bytes)`
      );
    }

    // Validate file has content
    if (file.size === 0) {
      throw new BadRequestException(
        `File "${file.originalname}" is empty (0 bytes)`
      );
    }

    // For memory storage, buffer is already available
    // For disk storage, we would read the file
    const buffer = file.buffer || (await this.readFileFromDisk(file.path));

    return {
      filename: this.sanitizeFilename(file.originalname),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      buffer: buffer,
    };
  }

  /**
   * Reads file from disk (for disk storage configuration)
   * @param filePath - Path to file on disk
   * @returns File buffer
   */
  private async readFileFromDisk(filePath: string): Promise<Buffer> {
    if (!filePath) {
      throw new Error('File path is required for disk storage');
    }

    const fs = await import('fs/promises');
    return await fs.readFile(filePath);
  }

  /**
   * Sanitizes filename to remove potentially dangerous characters
   * @param filename - Original filename
   * @returns Sanitized filename
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^\w\s.-]/g, '') // Remove special characters except word chars, spaces, dots, hyphens
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
      .replace(/^\.+/, '') // Remove leading dots
      .substring(0, 255); // Limit length to 255 chars
  }

  /**
   * Converts processed files to Gmail attachment format
   * @param processedFiles - Array of processed files
   * @returns Array of attachments with base64 data
   */
  convertToGmailAttachments(processedFiles: ProcessedFile[]): Array<{
    filename: string;
    mimeType: string;
    data: string;
  }> {
    return processedFiles.map((file) => ({
      filename: file.filename,
      mimeType: file.mimeType,
      data: file.buffer.toString('base64'),
    }));
  }

  /**
   * Cleans up temporary files (for disk storage)
   * @param files - Array of uploaded files
   */
  async cleanupFiles(files: Express.Multer.File[]): Promise<void> {
    if (!files || files.length === 0) {
      return;
    }

    const cleanupPromises = files
      .filter((file) => file.path) // Only disk-stored files have paths
      .map(async (file) => {
        try {
          await unlink(file.path);
          this.logger.debug(
            { filepath: file.path },
            'Cleaned up temporary file'
          );
        } catch (error) {
          this.logger.warn(
            {
              filepath: file.path,
              error: error.message,
            },
            'Failed to cleanup temporary file'
          );
        }
      });

    await Promise.allSettled(cleanupPromises);
  }

  /**
   * Validates file count
   * @param files - Array of files
   * @throws BadRequestException if too many files
   */
  validateFileCount(files: Express.Multer.File[]): void {
    if (files && files.length > FILE_UPLOAD_LIMITS.MAX_FILES) {
      throw new BadRequestException(
        `Too many files. Maximum allowed: ${FILE_UPLOAD_LIMITS.MAX_FILES}, received: ${files.length}`
      );
    }
  }

  /**
   * Gets file upload statistics
   * @param files - Array of files
   * @returns Upload statistics
   */
  getUploadStats(files: Express.Multer.File[]): {
    count: number;
    totalSize: number;
    averageSize: number;
    mimeTypes: string[];
  } {
    if (!files || files.length === 0) {
      return {
        count: 0,
        totalSize: 0,
        averageSize: 0,
        mimeTypes: [],
      };
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const mimeTypes = [...new Set(files.map((file) => file.mimetype))];

    return {
      count: files.length,
      totalSize,
      averageSize: Math.round(totalSize / files.length),
      mimeTypes,
    };
  }

  /**
   * Formats file size to human-readable format
   * @param bytes - Size in bytes
   * @returns Formatted string (e.g., "1.5 MB")
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Checks if file type is allowed
   * @param mimeType - MIME type to check
   * @param allowedTypes - Array of allowed MIME types
   * @returns True if allowed
   */
  isFileTypeAllowed(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType);
  }

  /**
   * Extracts file extension from filename
   * @param filename - Filename
   * @returns File extension (including dot)
   */
  getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }

  /**
   * Validates file extension
   * @param filename - Filename
   * @param allowedExtensions - Array of allowed extensions
   * @returns True if allowed
   */
  isExtensionAllowed(filename: string, allowedExtensions: string[]): boolean {
    const ext = this.getFileExtension(filename).toLowerCase();
    return allowedExtensions.includes(ext);
  }
}
