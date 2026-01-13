import {
  Inject,
  Injectable,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { gmail_v1 } from 'googleapis';
import { GMAIL_CONFIG } from '../../common/constants/gmail.constants';
import { GmailFormat, GmailLabel } from '../../common/enums';
import { GmailOperationException } from '../../common/exceptions/gmail.exception';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { GmailClientFactoryService } from '../../common/services/gmail-client-factory.service';
import { EmailMetadataService } from '../email-metadata/services/email-metadata.service';
import { KanbanConfigService } from '../email-metadata/services/kanban-config.service';
import { EmailReplyBuilder } from './builders/email-reply.builder';
import { EmailBuilder } from './builders/email.builder';
import { MimeMultipartBuilder } from './builders/mime-multipart.builder';
import { ReplyEmailDto } from './dto/reply-email.dto';
import { SendEmailWithAttachmentsDto } from './dto/send-email-with-attachments.dto';
import {
  AttachmentService,
  DownloadedAttachment,
} from './services/attachment.service';
import { EmailThreadingService } from './services/email-threading.service';
import {
  FileUploadService,
  ProcessedFile,
} from './services/file-upload.service';
import { Base64UrlEmailEncoder } from './strategies/email-encoder.strategy';

interface EmailListParams {
  labelId?: string;
  pageToken?: string;
  maxResults?: number;
  pageSize?: number;
}

interface SendEmailData {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

interface SendEmailResult {
  id?: string | null;
  threadId?: string | null;
  labelIds?: string[] | null;
}

interface ModifyEmailData {
  addLabelIds?: string[];
  removeLabelIds?: string[];
}

@Injectable()
export class GmailService {
  private readonly emailBuilder = new EmailBuilder();
  private readonly emailEncoder = new Base64UrlEmailEncoder();

  constructor(
    private readonly gmailClientFactory: GmailClientFactoryService,
    private readonly logger: AppLoggerService,
    private readonly attachmentService: AttachmentService,
    private readonly threadingService: EmailThreadingService,
    private readonly fileUploadService: FileUploadService,
    private readonly emailMetadataService: EmailMetadataService,
    @Inject(forwardRef(() => KanbanConfigService))
    private readonly kanbanConfigService: KanbanConfigService
  ) {
    this.logger.setContext('GmailService');
  }

  private async getGmailClient(userId: string): Promise<gmail_v1.Gmail> {
    try {
      return await this.gmailClientFactory.createClient(userId);
    } catch (error) {
      this.logger.error(
        {
          userId,
          error: error.message,
        },
        'Failed to create Gmail client'
      );
      throw error;
    }
  }

  /**
   * Wrapper to execute Gmail API calls with error handling for invalid tokens
   */
  private async executeGmailApiCall<T>(
    userId: string,
    apiCall: (gmail: gmail_v1.Gmail) => Promise<T>
  ): Promise<T> {
    try {
      const gmail = await this.getGmailClient(userId);
      return await apiCall(gmail);
    } catch (error) {
      // Check if this is an invalid_grant error (expired/revoked refresh token)
      if (
        error.message?.includes('invalid_grant') ||
        error.response?.data?.error === 'invalid_grant'
      ) {
        this.logger.error(
          {
            userId,
            error: 'invalid_grant',
          },
          'Google refresh token invalid. Clearing tokens.'
        );
        await this.gmailClientFactory.clearInvalidTokens(userId);
        throw new UnauthorizedException(
          'Your Google authentication has expired. Please reconnect your Google account.'
        );
      }

      throw error;
    }
  }

  async listLabels(userId: string) {
    try {
      return await this.executeGmailApiCall(userId, async (gmail) => {
        const response = await gmail.users.labels.list({
          userId: GMAIL_CONFIG.USER_ID,
        });
        return response.data.labels || [];
      });
    } catch (error) {
      throw new GmailOperationException('fetch labels', error);
    }
  }

  async listEmails(userId: string, params: EmailListParams = {}) {
    try {
      return await this.executeGmailApiCall(userId, async (gmail) => {
        const {
          labelId = GmailLabel.INBOX,
          pageToken,
          maxResults = GMAIL_CONFIG.DEFAULT_PAGE_SIZE,
        } = params;

        const response = await gmail.users.messages.list({
          userId: GMAIL_CONFIG.USER_ID,
          labelIds: [labelId],
          maxResults,
          pageToken,
        });

        const messages = response.data.messages || [];
        const emails = await this.fetchEmailsMetadata(gmail, messages);

        // Enrich emails with metadata from database (kanbanStatus, snoozeUntil, summary)
        // Use batch query to avoid N+1 problem
        const emailIds = emails.map((email) => email.id);
        const metadataList =
          await this.emailMetadataService.getMetadataForEmails(
            userId,
            emailIds
          );

        // Create a map for quick lookup
        const metadataMap = new Map(metadataList.map((m) => [m.emailId, m]));

        // Enrich emails with their metadata
        const enrichedEmails = emails.map((email) => {
          const metadata = metadataMap.get(email.id);
          return {
            ...email,
            kanbanStatus: metadata?.kanbanStatus || 'inbox',
            snoozeUntil: metadata?.snoozeUntil || null,
            summary: metadata?.summary || null,
          };
        });

        return {
          emails: enrichedEmails,
          nextPageToken: response.data.nextPageToken,
        };
      });
    } catch (error) {
      throw new GmailOperationException('fetch emails', error);
    }
  }

  async listKanbanEmails(userId: string) {
    try {
      // Get user's Kanban column configuration
      const columnConfig = await this.kanbanConfigService.getUserConfig(userId);

      return await this.executeGmailApiCall(userId, async (gmail) => {
        // Extract Gmail label IDs from all columns
        const labelIds = columnConfig.map((col) => col.gmailLabelId);

        this.logger.debug(
          `Fetching emails from ${
            labelIds.length
          } Kanban labels: ${labelIds.join(', ')}`
        );

        // Fetch emails from each label and merge results
        // Use a Map to deduplicate emails (an email can have multiple labels)
        const emailMap = new Map<string, any>();

        for (const labelId of labelIds) {
          try {
            const response = await gmail.users.messages.list({
              userId: GMAIL_CONFIG.USER_ID,
              labelIds: [labelId],
              maxResults: 100, // Fetch up to 100 per label
            });

            const messages = response.data.messages || [];

            // Add to map (deduplicate by email ID)
            messages.forEach((msg) => {
              if (msg.id && !emailMap.has(msg.id)) {
                emailMap.set(msg.id, msg);
              }
            });
          } catch (labelError) {
            this.logger.warn(
              `Failed to fetch emails for label ${labelId}: ${labelError.message}`
            );
            // Continue with other labels
          }
        }

        const messages = Array.from(emailMap.values());
        this.logger.debug(
          `Found ${messages.length} unique emails across all Kanban labels`
        );

        const emails = await this.fetchEmailsMetadata(gmail, messages);

        // Enrich with metadata from database
        const emailIds = emails.map((email) => email.id);
        const metadataList =
          await this.emailMetadataService.getMetadataForEmails(
            userId,
            emailIds
          );

        this.logger.debug(
          `Found ${metadataList.length} metadata records for ${emailIds.length} emails`
        );

        const metadataMap = new Map(metadataList.map((m) => [m.emailId, m]));

        // Map kanbanStatus to appropriate mailboxId for compatibility
        const statusToMailboxId = {
          inbox: 'INBOX',
          todo: 'TODO',
          in_progress: 'IN_PROGRESS',
          done: 'DONE',
          snoozed: 'SNOOZED',
        };

        const enrichedEmails = emails.map((email) => {
          const metadata = metadataMap.get(email.id);
          const kanbanStatus = metadata?.kanbanStatus || 'inbox';

          return {
            ...email,
            kanbanStatus,
            mailboxId: statusToMailboxId[kanbanStatus] || 'INBOX',
            snoozeUntil: metadata?.snoozeUntil || null,
            summary: metadata?.summary || null,
          };
        });

        return { emails: enrichedEmails };
      });
    } catch (error) {
      throw new GmailOperationException('fetch kanban emails', error);
    }
  }

  private async fetchEmailsMetadata(
    gmail: gmail_v1.Gmail,
    messages: Array<{ id?: string | null }>
  ) {
    return Promise.all(
      messages.map(async (message) => {
        const emailData = await gmail.users.messages.get({
          userId: GMAIL_CONFIG.USER_ID,
          id: message.id,
          format: GmailFormat.METADATA,
          metadataHeaders: GMAIL_CONFIG.METADATA_HEADERS as unknown as string[],
        });
        return emailData.data;
      })
    );
  }

  async getEmail(userId: string, emailId: string) {
    try {
      const gmail = await this.getGmailClient(userId);
      const response = await gmail.users.messages.get({
        userId: GMAIL_CONFIG.USER_ID,
        id: emailId,
        format: GmailFormat.FULL,
      });
      return response.data;
    } catch (error) {
      throw new GmailOperationException('fetch email', error);
    }
  }

  async sendEmail(userId: string, emailData: SendEmailData) {
    try {
      const gmail = await this.getGmailClient(userId);
      const { to, subject, body, cc, bcc } = emailData;

      const email = this.emailBuilder
        .setTo(to)
        .setSubject(subject)
        .setBody(body)
        .setCc(cc || '')
        .setBcc(bcc || '')
        .build();

      const encodedEmail = this.emailEncoder.encode(email);

      const response = await gmail.users.messages.send({
        userId: GMAIL_CONFIG.USER_ID,
        requestBody: {
          raw: encodedEmail,
        },
      });

      this.emailBuilder.reset();
      return { id: response.data.id };
    } catch (error) {
      throw new GmailOperationException('send email', error);
    }
  }

  async modifyEmail(
    userId: string,
    emailId: string,
    modifications: ModifyEmailData
  ) {
    try {
      const gmail = await this.getGmailClient(userId);
      await gmail.users.messages.modify({
        userId: GMAIL_CONFIG.USER_ID,
        id: emailId,
        requestBody: {
          addLabelIds: modifications.addLabelIds || [],
          removeLabelIds: modifications.removeLabelIds || [],
        },
      });
    } catch (error) {
      throw new GmailOperationException('modify email', error);
    }
  }

  async markAsRead(userId: string, emailId: string, read: boolean) {
    const modifications: ModifyEmailData = read
      ? { removeLabelIds: [GmailLabel.UNREAD] }
      : { addLabelIds: [GmailLabel.UNREAD] };
    return this.modifyEmail(userId, emailId, modifications);
  }

  async deleteEmail(userId: string, emailId: string) {
    try {
      const gmail = await this.getGmailClient(userId);
      await gmail.users.messages.trash({
        userId: GMAIL_CONFIG.USER_ID,
        id: emailId,
      });
    } catch (error) {
      throw new GmailOperationException('delete email', error);
    }
  }

  /**
   * Reply to an email with threading support
   * Maintains thread continuity by setting proper In-Reply-To and References headers
   * @param userId - User ID
   * @param emailId - Original email ID to reply to
   * @param replyData - Reply email data
   * @returns Sent message details
   */
  async replyToEmail(
    userId: string,
    emailId: string,
    replyData: ReplyEmailDto
  ): Promise<SendEmailResult> {
    try {
      this.logger.info(
        {
          userId,
          emailId,
          action: 'reply_to_email',
        },
        'Replying to email'
      );

      const gmail = await this.getGmailClient(userId);

      // Fetch the original message to extract threading information
      const originalMessage = await gmail.users.messages.get({
        userId: GMAIL_CONFIG.USER_ID,
        id: emailId,
        format: GmailFormat.FULL,
      });

      // Build the reply using EmailReplyBuilder
      const replyBuilder = new EmailReplyBuilder()
        .setOriginalMessage(originalMessage.data)
        .setReplyBody(replyData.body)
        .setTo(replyData.to);

      if (replyData.cc) {
        replyBuilder.setCc(replyData.cc);
      }

      if (replyData.bcc) {
        replyBuilder.setBcc(replyData.bcc);
      }

      const replyEmail = replyBuilder.buildForGmailApi();

      // Send the reply
      const response = await gmail.users.messages.send({
        userId: GMAIL_CONFIG.USER_ID,
        requestBody: {
          raw: replyEmail.raw,
          threadId: replyEmail.threadId,
        },
      });

      this.logger.info(
        {
          messageId: response.data.id,
          threadId: response.data.threadId,
          action: 'reply_sent',
        },
        'Reply sent successfully'
      );

      replyBuilder.reset();

      return {
        id: response.data.id,
        threadId: response.data.threadId,
        labelIds: response.data.labelIds,
      };
    } catch (error) {
      this.logger.error(
        {
          userId,
          emailId,
          error: error.message,
        },
        'Failed to reply to email'
      );
      throw new GmailOperationException('reply to email', error);
    }
  }

  /**
   * Send email with file attachments
   * Creates RFC-compliant multipart/mixed MIME message
   * @param userId - User ID
   * @param emailData - Email data including attachments
   * @returns Sent message details
   */
  async sendEmailWithAttachments(
    userId: string,
    emailData: SendEmailWithAttachmentsDto
  ): Promise<SendEmailResult> {
    try {
      this.logger.info(
        {
          userId,
          to: emailData.to,
          hasAttachments: !!(
            emailData.attachments && emailData.attachments.length > 0
          ),
          attachmentCount: emailData.attachments?.length || 0,
          action: 'send_email_with_attachments',
        },
        'Sending email with attachments'
      );

      const gmail = await this.getGmailClient(userId);

      // Build multipart MIME message
      const mimeBuilder = new MimeMultipartBuilder()
        .setMultipartType('mixed')
        .setTo(emailData.to)
        .setSubject(emailData.subject)
        .setDate();

      // Add optional headers
      if (emailData.cc) {
        mimeBuilder.setCc(emailData.cc);
      }

      if (emailData.bcc) {
        mimeBuilder.setBcc(emailData.bcc);
      }

      // Add threading headers if this is a reply
      if (emailData.inReplyTo || emailData.references) {
        mimeBuilder.setThreadingHeaders(
          emailData.inReplyTo,
          emailData.references
        );
      }

      // Generate Message-ID
      mimeBuilder.setMessageId();

      // Add email body (HTML)
      mimeBuilder.addHtmlPart(emailData.body);

      // Add attachments if present
      if (emailData.attachments && emailData.attachments.length > 0) {
        emailData.attachments.forEach((attachment) => {
          mimeBuilder.addAttachment(
            attachment.filename,
            attachment.mimeType,
            attachment.data
          );
        });

        this.logger.debug({
          attachmentCount: emailData.attachments.length,
          attachmentNames: emailData.attachments.map((a) => a.filename),
        });
      }

      // Build and encode the message
      const encodedEmail = mimeBuilder.buildAndEncode();

      // Send the email
      const requestBody: gmail_v1.Schema$Message = {
        raw: encodedEmail,
      };

      // Include threadId if provided
      if (emailData.threadId) {
        requestBody.threadId = emailData.threadId;
      }

      const response = await gmail.users.messages.send({
        userId: GMAIL_CONFIG.USER_ID,
        requestBody,
      });

      this.logger.info(
        {
          messageId: response.data.id,
          threadId: response.data.threadId,
          action: 'email_with_attachments_sent',
        },
        'Email with attachments sent successfully'
      );

      mimeBuilder.reset();

      return {
        id: response.data.id,
        threadId: response.data.threadId,
        labelIds: response.data.labelIds,
      };
    } catch (error) {
      this.logger.error(
        {
          userId,
          error: error.message,
        },
        'Failed to send email with attachments'
      );
      throw new GmailOperationException('send email with attachments', error);
    }
  }

  /**
   * Download an email attachment using stable partId
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
          action: 'download_attachment',
        },
        'Downloading attachment using stable partId'
      );

      return await this.attachmentService.downloadAttachment(
        userId,
        messageId,
        partId
      );
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
      throw error; // AttachmentService already throws GmailOperationException
    }
  }

  /**
   * List all attachments in an email
   * @param userId - User ID
   * @param messageId - Gmail message ID
   * @returns Array of attachment metadata
   */
  async listEmailAttachments(userId: string, messageId: string) {
    try {
      this.logger.info(
        {
          userId,
          messageId,
          action: 'list_attachments',
        },
        'Listing email attachments'
      );

      return await this.attachmentService.listAttachments(userId, messageId);
    } catch (error) {
      this.logger.error(
        {
          userId,
          messageId,
          error: error.message,
        },
        'Failed to list attachments'
      );
      throw error;
    }
  }

  /**
   * Send email with file attachments from multipart/form-data
   * More efficient than base64-in-JSON approach for large files
   * @param userId - User ID
   * @param emailData - Email data (to, subject, body, etc.)
   * @param files - Uploaded files from multipart/form-data
   * @returns Sent message details
   */
  async sendEmailWithMultipartFiles(
    userId: string,
    emailData: {
      to: string;
      subject: string;
      body: string;
      cc?: string;
      bcc?: string;
      threadId?: string;
      inReplyTo?: string;
      references?: string;
    },
    files?: Express.Multer.File[]
  ): Promise<SendEmailResult> {
    try {
      this.logger.info(
        {
          userId,
          to: emailData.to,
          hasFiles: !!(files && files.length > 0),
          fileCount: files?.length || 0,
        },
        'Sending email with multipart files'
      );

      const gmail = await this.getGmailClient(userId);

      // Process uploaded files
      let processedFiles: ProcessedFile[] = [];
      if (files && files.length > 0) {
        this.fileUploadService.validateFileCount(files);
        processedFiles = await this.fileUploadService.processUploadedFiles(
          files
        );

        const stats = this.fileUploadService.getUploadStats(files);
        this.logger.debug({
          stats,
          filenames: processedFiles.map((f) => f.filename),
        });
      }

      // Build multipart MIME message
      const mimeBuilder = new MimeMultipartBuilder()
        .setMultipartType('mixed')
        .setTo(emailData.to)
        .setSubject(emailData.subject)
        .setDate();

      // Add optional headers
      if (emailData.cc) {
        mimeBuilder.setCc(emailData.cc);
      }

      if (emailData.bcc) {
        mimeBuilder.setBcc(emailData.bcc);
      }

      // Add threading headers if this is a reply
      if (emailData.inReplyTo || emailData.references) {
        mimeBuilder.setThreadingHeaders(
          emailData.inReplyTo,
          emailData.references
        );
      }

      // Generate Message-ID
      mimeBuilder.setMessageId();

      // Add email body (HTML)
      mimeBuilder.addHtmlPart(emailData.body);

      // Add attachments if present
      if (processedFiles.length > 0) {
        processedFiles.forEach((file) => {
          const base64Data = file.buffer.toString('base64');
          mimeBuilder.addAttachment(file.filename, file.mimeType, base64Data);
        });

        this.logger.debug({
          attachmentCount: processedFiles.length,
          attachmentNames: processedFiles.map((f) => f.filename),
          totalSize: processedFiles.reduce((sum, f) => sum + f.size, 0),
        });
      }

      // Build and encode the message
      const encodedEmail = mimeBuilder.buildAndEncode();

      // Send the email
      const requestBody: gmail_v1.Schema$Message = {
        raw: encodedEmail,
      };

      // Include threadId if provided
      if (emailData.threadId) {
        requestBody.threadId = emailData.threadId;
      }

      const response = await gmail.users.messages.send({
        userId: GMAIL_CONFIG.USER_ID,
        requestBody,
      });

      this.logger.info(
        {
          messageId: response.data.id,
          threadId: response.data.threadId,
          action: 'email_with_multipart_files_sent',
        },
        'Email with multipart files sent successfully'
      );

      mimeBuilder.reset();

      return {
        id: response.data.id,
        threadId: response.data.threadId,
        labelIds: response.data.labelIds,
      };
    } catch (error) {
      this.logger.error(
        {
          userId,
          error: error.message,
        },
        'Failed to send email with multipart files'
      );
      throw new GmailOperationException(
        'send email with multipart files',
        error
      );
    }
  }

  /**
   * Reply to an email with file attachments from multipart/form-data
   * Maintains thread continuity with uploaded files
   * @param userId - User ID
   * @param emailId - Original email ID to reply to
   * @param replyData - Reply data
   * @param files - Uploaded files from multipart/form-data
   * @returns Sent message details
   */
  async replyToEmailWithMultipartFiles(
    userId: string,
    emailId: string,
    replyData: {
      to: string;
      body: string;
      cc?: string;
      bcc?: string;
    },
    files?: Express.Multer.File[]
  ): Promise<SendEmailResult> {
    try {
      this.logger.info(
        {
          userId,
          emailId,
          hasFiles: !!(files && files.length > 0),
          fileCount: files?.length || 0,
          action: 'reply_to_email_with_multipart',
        },
        'Replying to email with multipart files'
      );

      const gmail = await this.getGmailClient(userId);

      // Fetch the original message to extract threading information
      const originalMessage = await gmail.users.messages.get({
        userId: GMAIL_CONFIG.USER_ID,
        id: emailId,
        format: GmailFormat.FULL,
      });

      // Process uploaded files
      let processedFiles: ProcessedFile[] = [];
      if (files && files.length > 0) {
        this.fileUploadService.validateFileCount(files);
        processedFiles = await this.fileUploadService.processUploadedFiles(
          files
        );
      }

      // Extract threading info
      const threadingInfo = this.threadingService.extractThreadingInfo(
        originalMessage.data
      );

      // Build reply with attachments
      const mimeBuilder = new MimeMultipartBuilder()
        .setMultipartType('mixed')
        .setTo(replyData.to)
        .setSubject(
          this.threadingService.buildReplySubject(threadingInfo.subject)
        )
        .setDate();

      if (replyData.cc) {
        mimeBuilder.setCc(replyData.cc);
      }

      if (replyData.bcc) {
        mimeBuilder.setBcc(replyData.bcc);
      }

      // Add threading headers
      const references = this.threadingService.buildReferencesHeader(
        threadingInfo.messageId,
        threadingInfo.references
      );

      if (threadingInfo.messageId) {
        mimeBuilder.setThreadingHeaders(threadingInfo.messageId, references);
      }

      mimeBuilder.setMessageId();

      // Add reply body
      mimeBuilder.addHtmlPart(replyData.body);

      // Add attachments if present
      if (processedFiles.length > 0) {
        processedFiles.forEach((file) => {
          const base64Data = file.buffer.toString('base64');
          mimeBuilder.addAttachment(file.filename, file.mimeType, base64Data);
        });
      }

      // Build and encode
      const encodedEmail = mimeBuilder.buildAndEncode();

      // Send the reply
      const response = await gmail.users.messages.send({
        userId: GMAIL_CONFIG.USER_ID,
        requestBody: {
          raw: encodedEmail,
          threadId: originalMessage.data.threadId,
        },
      });

      this.logger.info(
        {
          messageId: response.data.id,
          threadId: response.data.threadId,
          action: 'reply_with_multipart_sent',
        },
        'Reply with multipart files sent successfully'
      );

      mimeBuilder.reset();

      return {
        id: response.data.id,
        threadId: response.data.threadId,
        labelIds: response.data.labelIds,
      };
    } catch (error) {
      this.logger.error(
        {
          userId,
          emailId,
          error: error.message,
        },
        'Failed to reply with multipart files'
      );
      throw new GmailOperationException('reply with multipart files', error);
    }
  }

  /**
   * Create a new Gmail label
   */
  async createLabel(
    userId: string,
    name: string
  ): Promise<{ id: string; name: string }> {
    try {
      const gmail = await this.getGmailClient(userId);

      const response = await gmail.users.labels.create({
        userId: GMAIL_CONFIG.USER_ID,
        requestBody: {
          name,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
      });

      this.logger.debug(
        `Created Gmail label: ${name} (${response.data.id}) for user ${userId}`
      );

      return {
        id: response.data.id || '',
        name: response.data.name || name,
      };
    } catch (error) {
      this.logger.error(
        {
          userId,
          labelName: name,
          error: error.message,
        },
        'Failed to create Gmail label'
      );
      throw new GmailOperationException('create label', error);
    }
  }

  /**
   * Update an existing Gmail label's name
   */
  async updateLabel(
    userId: string,
    labelId: string,
    newName: string
  ): Promise<void> {
    try {
      const gmail = await this.getGmailClient(userId);

      await gmail.users.labels.update({
        userId: GMAIL_CONFIG.USER_ID,
        id: labelId,
        requestBody: {
          name: newName,
        },
      });

      this.logger.debug(
        `Updated Gmail label ${labelId} to "${newName}" for user ${userId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to update Gmail label ${labelId} to "${newName}" for user ${userId}: ${error.message}`
      );
      throw new GmailOperationException('update label', error);
    }
  }

  /**
   * Delete a Gmail label
   */
  async deleteLabel(userId: string, labelId: string): Promise<void> {
    try {
      const gmail = await this.getGmailClient(userId);

      await gmail.users.labels.delete({
        userId: GMAIL_CONFIG.USER_ID,
        id: labelId,
      });

      this.logger.debug(`Deleted Gmail label ${labelId} for user ${userId}`);
    } catch (error) {
      this.logger.error(
        {
          userId,
          labelId,
          error: error.message,
        },
        'Failed to delete Gmail label'
      );
      throw new GmailOperationException('delete label', error);
    }
  }
}
