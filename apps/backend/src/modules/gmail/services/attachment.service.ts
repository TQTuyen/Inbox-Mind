import { Injectable } from '@nestjs/common';
import { gmail_v1 } from 'googleapis';
import { GMAIL_CONFIG } from '../../../common/constants/gmail.constants';
import { GmailOperationException } from '../../../common/exceptions/gmail.exception';
import { AppLoggerService } from '../../../common/logger/app-logger.service';
import { GmailClientFactoryService } from '../../../common/services/gmail-client-factory.service';
import { MimeUtils } from '../utils/mime.utils';

/**
 * Attachment metadata interface
 * Uses partId for stable identification instead of dynamic attachmentId
 */
export interface AttachmentMetadata {
  partId: string; // Stable identifier that doesn't change between requests
  attachmentId: string; // Dynamic ID from current request (for backwards compatibility)
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * Downloaded attachment interface
 */
export interface DownloadedAttachment {
  data: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * Attachment Service
 * Handles downloading and managing email attachments from Gmail
 * Implements streaming for efficient memory usage with large files
 */
@Injectable()
export class AttachmentService {
  constructor(
    private readonly gmailClientFactory: GmailClientFactoryService,
    private readonly logger: AppLoggerService
  ) {
    this.logger.setContext('AttachmentService');
  }

  /**
   * Downloads an attachment from a Gmail message using stable partId
   * @param userId - User ID
   * @param messageId - Gmail message ID
   * @param partId - Stable part ID (e.g., "0", "1", "1.0")
   * @returns Downloaded attachment with data and metadata
   */
  async downloadAttachment(
    userId: string,
    messageId: string,
    partId: string
  ): Promise<DownloadedAttachment> {
    try {
      this.logger.info(
        {
          userId,
          messageId,
          partId,
        },
        `Downloading attachment with partId ${partId} from message ${messageId} for user ${userId}`
      );

      const gmail = await this.gmailClientFactory.createClient(userId);

      // First, get the message to find the part and extract current attachmentId
      const message = await this.getMessage(gmail, messageId);
      const attachmentMetadata = this.findAttachmentMetadataByPartId(
        message,
        partId
      );

      if (!attachmentMetadata) {
        throw new Error(
          `Attachment with partId ${partId} not found in message`
        );
      }

      // Use the current attachmentId from the fetched message (this is fresh and valid)
      const attachment = await gmail.users.messages.attachments.get({
        userId: GMAIL_CONFIG.USER_ID,
        messageId: messageId,
        id: attachmentMetadata.attachmentId,
      });

      if (!attachment.data.data) {
        throw new Error('Attachment data is empty');
      }

      // Decode the base64 attachment data
      const buffer = MimeUtils.decodeBase64ToBuffer(attachment.data.data);

      this.logger.info(
        {
          filename: attachmentMetadata.filename,
          size: buffer.length,
        },
        `Successfully downloaded attachment ${attachmentMetadata.filename} (${buffer.length} bytes)`
      );

      return {
        data: buffer,
        filename: attachmentMetadata.filename,
        mimeType: attachmentMetadata.mimeType,
        size: buffer.length,
      };
    } catch (error) {
      this.logger.error(
        {
          userId,
          messageId,
          partId,
          error: error.message,
        },
        'Failed to download attachment'
      );
      throw new GmailOperationException('download attachment', error);
    }
  }

  /**
   * Lists all attachments in a message
   * @param userId - User ID
   * @param messageId - Gmail message ID
   * @returns Array of attachment metadata
   */
  async listAttachments(
    userId: string,
    messageId: string
  ): Promise<AttachmentMetadata[]> {
    try {
      this.logger.info(
        {
          userId,
          messageId,
        },
        `Listing attachments for message ${messageId} for user ${userId}`
      );

      const gmail = await this.gmailClientFactory.createClient(userId);
      const message = await this.getMessage(gmail, messageId);

      const attachments = this.extractAttachmentsMetadata(message);

      this.logger.info(
        {
          messageId,
          count: attachments.length,
        },
        `Found ${attachments.length} attachment(s) in message ${messageId}`
      );

      return attachments;
    } catch (error) {
      this.logger.error(
        {
          userId,
          messageId,
          error: error.message,
        },
        'Failed to list attachments'
      );
      throw new GmailOperationException('list attachments', error);
    }
  }

  /**
   * Gets a Gmail message with full payload
   * @param gmail - Gmail client
   * @param messageId - Message ID
   * @returns Gmail message object
   */
  private async getMessage(
    gmail: gmail_v1.Gmail,
    messageId: string
  ): Promise<gmail_v1.Schema$Message> {
    const response = await gmail.users.messages.get({
      userId: GMAIL_CONFIG.USER_ID,
      id: messageId,
      format: 'full',
    });

    return response.data;
  }

  /**
   * Finds specific attachment metadata in a message by partId (stable identifier)
   * @param message - Gmail message
   * @param partId - Part ID to find (e.g., "0", "1", "1.0")
   * @returns Attachment metadata or undefined
   */
  private findAttachmentMetadataByPartId(
    message: gmail_v1.Schema$Message,
    partId: string
  ): AttachmentMetadata | undefined {
    const attachments = this.extractAttachmentsMetadata(message);
    return attachments.find((att) => att.partId === partId);
  }

  /**
   * Finds specific attachment metadata in a message by attachmentId (for backwards compatibility)
   * @param message - Gmail message
   * @param attachmentId - Attachment ID to find
   * @returns Attachment metadata or undefined
   * @deprecated Use findAttachmentMetadataByPartId instead for stable identification
   */
  private findAttachmentMetadata(
    message: gmail_v1.Schema$Message,
    attachmentId: string
  ): AttachmentMetadata | undefined {
    const attachments = this.extractAttachmentsMetadata(message);
    return attachments.find((att) => att.attachmentId === attachmentId);
  }

  /**
   * Extracts all attachment metadata from a message
   * Recursively searches through message parts
   * @param message - Gmail message
   * @returns Array of attachment metadata
   */
  private extractAttachmentsMetadata(
    message: gmail_v1.Schema$Message
  ): AttachmentMetadata[] {
    const attachments: AttachmentMetadata[] = [];

    if (!message.payload) {
      return attachments;
    }

    // Extract attachments with partId for stable identification
    this.extractFromPart(message.payload, attachments, '');

    return attachments;
  }

  /**
   * Recursively extracts attachments from message parts
   * @param part - Message part
   * @param attachments - Accumulator array for attachments
   * @param parentPartId - Parent part ID for building hierarchical partId
   */
  private extractFromPart(
    part: gmail_v1.Schema$MessagePart,
    attachments: AttachmentMetadata[],
    parentPartId: string
  ): void {
    // Build the current partId (e.g., "0", "1", "1.0", "1.1")
    const currentPartId = part.partId || parentPartId || '0';

    // Check if this part is an attachment
    if (part.body?.attachmentId) {
      const filename = this.getFilename(part);
      const mimeType = part.mimeType || 'application/octet-stream';
      const size = part.body.size || 0;

      attachments.push({
        partId: currentPartId, // Stable identifier
        attachmentId: part.body.attachmentId, // Dynamic ID from current request
        filename,
        mimeType,
        size,
      });

      this.logger.debug(
        {
          partId: currentPartId,
          attachmentId: part.body.attachmentId,
          filename,
          size,
        },
        `Found attachment: ${filename} (partId: ${currentPartId})`
      );
    }

    // Recursively check child parts
    if (part.parts && part.parts.length > 0) {
      part.parts.forEach((childPart, index) => {
        // Build hierarchical partId (e.g., "1.0", "1.1")
        const childPartId = currentPartId
          ? `${currentPartId}.${index}`
          : `${index}`;
        this.extractFromPart(childPart, attachments, childPartId);
      });
    }
  }

  /**
   * Extracts filename from message part headers
   * @param part - Message part
   * @returns Filename or default name
   */
  private getFilename(part: gmail_v1.Schema$MessagePart): string {
    if (part.filename) {
      return part.filename;
    }

    // Try to extract from Content-Disposition header
    const contentDisposition = this.getHeaderValue(
      part.headers,
      'Content-Disposition'
    );

    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";\n]+)"?/i);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Generate default filename based on MIME type
    return this.generateDefaultFilename(part.mimeType);
  }

  /**
   * Gets header value from headers array
   * @param headers - Array of headers
   * @param headerName - Header name to find
   * @returns Header value or undefined
   */
  private getHeaderValue(
    headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
    headerName: string
  ): string | undefined {
    if (!headers) {
      return undefined;
    }

    const header = headers.find(
      (h) => h.name?.toLowerCase() === headerName.toLowerCase()
    );

    return header?.value;
  }

  /**
   * Generates a default filename based on MIME type
   * @param mimeType - MIME type
   * @returns Generated filename
   */
  private generateDefaultFilename(mimeType?: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'text/html': 'html',
      'application/zip': 'zip',
    };

    const ext = mimeType ? extensions[mimeType] || 'bin' : 'bin';
    return `attachment-${Date.now()}.${ext}`;
  }

  /**
   * Validates attachment size against maximum allowed
   * @param size - Attachment size in bytes
   * @param maxSize - Maximum allowed size in bytes (default: 25MB)
   * @returns True if valid
   * @throws Error if size exceeds maximum
   */
  validateAttachmentSize(
    size: number,
    maxSize: number = 25 * 1024 * 1024
  ): boolean {
    if (size > maxSize) {
      throw new Error(
        `Attachment size (${size} bytes) exceeds maximum allowed size (${maxSize} bytes)`
      );
    }
    return true;
  }

  /**
   * Gets content type for response headers
   * @param mimeType - MIME type
   * @returns Content type string
   */
  getContentType(mimeType: string): string {
    return mimeType || 'application/octet-stream';
  }

  /**
   * Gets content disposition header value
   * @param filename - Filename
   * @param inline - Whether to display inline (default: false for download)
   * @returns Content-Disposition header value
   */
  getContentDisposition(filename: string, inline = false): string {
    const sanitizedFilename = MimeUtils.sanitizeFilename(filename);
    const encodedFilename = encodeURIComponent(sanitizedFilename);
    const disposition = inline ? 'inline' : 'attachment';

    // RFC 5987 for international filenames
    return `${disposition}; filename="${sanitizedFilename}"; filename*=UTF-8''${encodedFilename}`;
  }
}
