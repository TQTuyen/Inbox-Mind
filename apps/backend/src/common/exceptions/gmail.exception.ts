import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

export class GmailOperationException extends InternalServerErrorException {
  constructor(operation: string, originalError?: unknown) {
    super(`Failed to ${operation}`);
    this.name = 'GmailOperationException';
    if (originalError) {
      console.error(`Gmail ${operation} error:`, originalError);
    }
  }
}

export class EmailNotFoundException extends NotFoundException {
  constructor(emailId: string) {
    super(`Email with id ${emailId} not found`);
    this.name = 'EmailNotFoundException';
  }
}

export class LabelNotFoundException extends NotFoundException {
  constructor(labelId: string) {
    super(`Label with id ${labelId} not found`);
    this.name = 'LabelNotFoundException';
  }
}

export class AttachmentNotFoundException extends NotFoundException {
  constructor(attachmentId: string, messageId?: string) {
    const message = messageId
      ? `Attachment ${attachmentId} not found in message ${messageId}`
      : `Attachment ${attachmentId} not found`;
    super(message);
    this.name = 'AttachmentNotFoundException';
  }
}

export class AttachmentDownloadException extends InternalServerErrorException {
  constructor(attachmentId: string, originalError?: unknown) {
    super(`Failed to download attachment ${attachmentId}`);
    this.name = 'AttachmentDownloadException';
    if (originalError) {
      console.error(`Attachment download error:`, originalError);
    }
  }
}

export class AttachmentSizeException extends BadRequestException {
  constructor(size: number, maxSize: number) {
    super(
      `Attachment size (${size} bytes) exceeds maximum allowed size (${maxSize} bytes)`
    );
    this.name = 'AttachmentSizeException';
  }
}

export class InvalidMimeTypeException extends BadRequestException {
  constructor(mimeType: string) {
    super(`Invalid or unsupported MIME type: ${mimeType}`);
    this.name = 'InvalidMimeTypeException';
  }
}

export class EmailThreadingException extends InternalServerErrorException {
  constructor(messageId: string, originalError?: unknown) {
    super(`Failed to extract threading information from message ${messageId}`);
    this.name = 'EmailThreadingException';
    if (originalError) {
      console.error(`Email threading error:`, originalError);
    }
  }
}

export class TokenExpiredException extends UnauthorizedException {
  constructor(
    message = 'Google OAuth token has expired or been revoked. Please re-authenticate.'
  ) {
    super(message);
    this.name = 'TokenExpiredException';
  }
}
