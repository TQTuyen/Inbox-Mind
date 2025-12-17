import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { emailAttachmentConfig } from '../../common/config/multer.config';
import { GMAIL_CONFIG } from '../../common/constants/gmail.constants';
import { SUCCESS_MESSAGES } from '../../common/constants/messages.constants';
import {
  CurrentUser,
  CurrentUserData,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GmailClientFactoryService } from '../../common/services/gmail-client-factory.service';
import { AttachmentParamsDto } from './dto/attachment-params.dto';
import { EmailIdParamDto } from './dto/email-id-param.dto';
import {
  FuzzySearchQueryDto,
  FuzzySearchResponseDto,
} from './dto/fuzzy-search.dto';
import { ListEmailsQueryDto } from './dto/list-emails-query.dto';
import { ListThreadsQueryDto } from './dto/list-threads-query.dto';
import { MailboxIdParamDto } from './dto/mailbox-id-param.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { ModifyLabelsDto } from './dto/modify-labels.dto';
import { ReplyEmailDto } from './dto/reply-email.dto';
import {
  ReplyEmailMultipartDto,
  SendEmailMultipartDto,
} from './dto/send-email-multipart.dto';
import { SendEmailWithAttachmentsDto } from './dto/send-email-with-attachments.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { ThreadIdParamDto } from './dto/thread-id-param.dto';
import { ThreadResponseDto } from './dto/thread-response.dto';
import { GmailService } from './gmail.service';
import { FileUploadService } from './services/file-upload.service';
import { FuzzySearchService } from './services/fuzzy-search.service';
import { ThreadService } from './services/thread.service';
import { LabelModificationStrategyFactory } from './strategies/label-modification-strategy.factory';

@ApiTags('gmail')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class GmailController {
  constructor(
    private readonly gmailService: GmailService,
    private readonly labelStrategyFactory: LabelModificationStrategyFactory,
    private readonly gmailClientFactory: GmailClientFactoryService,
    private readonly fileUploadService: FileUploadService,
    private readonly threadService: ThreadService,
    private readonly fuzzySearchService: FuzzySearchService
  ) {}

  @Get('mailboxes')
  @ApiOperation({ summary: 'List mailboxes (labels)' })
  @ApiResponse({ status: 200, description: 'Returns list of mailboxes' })
  @UseGuards(JwtAuthGuard)
  async listMailboxes(@CurrentUser() user: CurrentUserData) {
    return this.gmailService.listLabels(user.userId);
  }

  @Get('mailboxes/:id/emails')
  @ApiOperation({ summary: 'List emails in a mailbox' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of emails' })
  @UseGuards(JwtAuthGuard)
  async listEmails(
    @CurrentUser() user: CurrentUserData,
    @Param() params: MailboxIdParamDto,
    @Query() query: ListEmailsQueryDto
  ) {
    return this.gmailService.listEmails(user.userId, {
      labelId: params.id,
      pageToken: query.page,
      maxResults: query.pageSize || GMAIL_CONFIG.DEFAULT_PAGE_SIZE,
    });
  }

  @Get('kanban/emails')
  @ApiOperation({ summary: 'List all emails for Kanban board (INBOX, TODO, IN_PROGRESS, DONE)' })
  @ApiResponse({ status: 200, description: 'Returns all kanban emails' })
  @UseGuards(JwtAuthGuard)
  async listKanbanEmails(@CurrentUser() user: CurrentUserData) {
    return this.gmailService.listKanbanEmails(user.userId);
  }

  @Get('search/fuzzy')
  @ApiOperation({
    summary: 'Fuzzy search emails with typo tolerance',
    description:
      'Search emails with fuzzy matching supporting typos and partial matches. Searches across subject, sender name, sender email, and email body.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns fuzzy search results ranked by relevance',
    type: FuzzySearchResponseDto,
  })
  @UseGuards(JwtAuthGuard)
  async fuzzySearch(
    @CurrentUser() user: CurrentUserData,
    @Query() query: FuzzySearchQueryDto
  ): Promise<FuzzySearchResponseDto> {
    return this.fuzzySearchService.fuzzySearch(user.userId, query);
  }

  @Get('emails/:id')
  @ApiOperation({ summary: 'Get email details' })
  @ApiResponse({ status: 200, description: 'Returns email details' })
  @UseGuards(JwtAuthGuard)
  async getEmail(
    @CurrentUser() user: CurrentUserData,
    @Param() params: EmailIdParamDto
  ) {
    return this.gmailService.getEmail(user.userId, params.id);
  }

  @Get('threads')
  @ApiOperation({
    summary: 'List email threads',
    description:
      'Retrieves a paginated list of email threads. Can be filtered by label/mailbox.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of threads with pagination',
  })
  @UseGuards(JwtAuthGuard)
  async listThreads(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ListThreadsQueryDto
  ) {
    return this.threadService.listThreads(
      user.userId,
      query.labelId,
      query.pageSize || GMAIL_CONFIG.DEFAULT_PAGE_SIZE,
      query.page
    );
  }

  @Get('threads/:id')
  @ApiOperation({
    summary: 'Get complete email thread (conversation)',
    description:
      'Retrieves an entire email thread with all messages sorted chronologically. Includes participant info, threading metadata, and message details.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns complete thread with all messages',
    type: ThreadResponseDto,
  })
  @UseGuards(JwtAuthGuard)
  async getThread(
    @CurrentUser() user: CurrentUserData,
    @Param() params: ThreadIdParamDto
  ) {
    return this.threadService.getThread(user.userId, params.id);
  }

  @Post('emails/send')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send an email (simple)' })
  @ApiResponse({ status: 201, description: 'Email sent successfully' })
  @UseGuards(JwtAuthGuard)
  async sendEmail(
    @CurrentUser() user: CurrentUserData,
    @Body() sendEmailDto: SendEmailDto
  ) {
    return this.gmailService.sendEmail(user.userId, sendEmailDto);
  }

  @Post('emails/send-with-attachments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send an email with file attachments' })
  @ApiResponse({
    status: 201,
    description: 'Email with attachments sent successfully',
  })
  @UseGuards(JwtAuthGuard)
  async sendEmailWithAttachments(
    @CurrentUser() user: CurrentUserData,
    @Body() sendEmailDto: SendEmailWithAttachmentsDto
  ) {
    return this.gmailService.sendEmailWithAttachments(
      user.userId,
      sendEmailDto
    );
  }

  @Post('emails/:id/reply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reply to an email (maintains threading)' })
  @ApiResponse({
    status: 201,
    description: 'Reply sent successfully with proper threading',
  })
  @UseGuards(JwtAuthGuard)
  async replyToEmail(
    @CurrentUser() user: CurrentUserData,
    @Param() params: EmailIdParamDto,
    @Body() replyDto: ReplyEmailDto
  ) {
    return this.gmailService.replyToEmail(user.userId, params.id, replyDto);
  }

  @Put('emails/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark email as read/unread' })
  @ApiResponse({ status: 200, description: 'Email status updated' })
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @CurrentUser() user: CurrentUserData,
    @Param() params: EmailIdParamDto,
    @Body() markReadDto: MarkReadDto
  ) {
    await this.gmailService.markAsRead(
      user.userId,
      params.id,
      markReadDto.read
    );
    return { message: SUCCESS_MESSAGES.EMAIL_UPDATED };
  }

  @Post('emails/:id/labels')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Modify email labels' })
  @ApiResponse({ status: 200, description: 'Labels updated successfully' })
  @UseGuards(JwtAuthGuard)
  async modifyLabels(
    @CurrentUser() user: CurrentUserData,
    @Param() params: EmailIdParamDto,
    @Body() modifyLabelsDto: ModifyLabelsDto
  ) {
    const gmail = await this.gmailClientFactory.createClient(user.userId);
    const strategy = this.labelStrategyFactory.getStrategy(
      modifyLabelsDto.action
    );

    await strategy.execute(gmail, params.id, modifyLabelsDto.labelIds);

    return { message: SUCCESS_MESSAGES.LABELS_UPDATED };
  }

  @Delete('emails/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an email' })
  @ApiResponse({ status: 200, description: 'Email deleted successfully' })
  @UseGuards(JwtAuthGuard)
  async deleteEmail(
    @CurrentUser() user: CurrentUserData,
    @Param() params: EmailIdParamDto
  ) {
    await this.gmailService.deleteEmail(user.userId, params.id);
    return { message: SUCCESS_MESSAGES.EMAIL_DELETED };
  }

  @Get('attachments/:messageId/:partId')
  @ApiOperation({
    summary: 'Download email attachment using stable partId',
    description:
      'Downloads attachment using stable partId instead of dynamic attachmentId. The partId remains consistent across requests, making downloads reliable.',
  })
  @ApiResponse({
    status: 200,
    description: 'Attachment downloaded successfully',
  })
  @UseGuards(JwtAuthGuard)
  async downloadAttachment(
    @CurrentUser() user: CurrentUserData,
    @Param() params: AttachmentParamsDto,
    @Res({ passthrough: true }) response: Response
  ): Promise<StreamableFile> {
    const attachment = await this.gmailService.downloadAttachment(
      user.userId,
      params.messageId,
      params.partId
    );

    // Set response headers for file download
    response.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(
        attachment.filename
      )}"`,
      'Content-Length': attachment.size.toString(),
    });

    return new StreamableFile(attachment.data);
  }

  @Get('emails/:id/attachments')
  @ApiOperation({ summary: 'List all attachments in an email' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of attachment metadata',
  })
  @UseGuards(JwtAuthGuard)
  async listEmailAttachments(
    @CurrentUser() user: CurrentUserData,
    @Param() params: EmailIdParamDto
  ) {
    return this.gmailService.listEmailAttachments(user.userId, params.id);
  }

  @Post('emails/send-multipart')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Send email with file attachments via multipart/form-data (RECOMMENDED)',
    description:
      'More efficient than base64-in-JSON. Handles large files with streaming. Maximum 10 files, 25MB per file, 50MB total.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Email data and file attachments',
    type: SendEmailMultipartDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Email sent successfully with multipart files',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('attachments', 10, emailAttachmentConfig))
  async sendEmailMultipart(
    @CurrentUser() user: CurrentUserData,
    @Body() emailData: SendEmailMultipartDto,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    try {
      const result = await this.gmailService.sendEmailWithMultipartFiles(
        user.userId,
        emailData,
        files
      );

      // Cleanup uploaded files (if using disk storage)
      if (files && files.length > 0) {
        await this.fileUploadService.cleanupFiles(files);
      }

      return result;
    } catch (error) {
      // Cleanup on error
      if (files && files.length > 0) {
        await this.fileUploadService.cleanupFiles(files);
      }
      throw error;
    }
  }

  @Post('emails/:id/reply-multipart')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Reply to email with file attachments via multipart/form-data (RECOMMENDED)',
    description:
      'Maintains threading while supporting file uploads. More efficient than base64. Maximum 10 files, 25MB per file.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Reply data and file attachments',
    type: ReplyEmailMultipartDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Reply sent successfully with multipart files and threading',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('attachments', 10, emailAttachmentConfig))
  async replyToEmailMultipart(
    @CurrentUser() user: CurrentUserData,
    @Param() params: EmailIdParamDto,
    @Body() replyData: ReplyEmailMultipartDto,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    try {
      const result = await this.gmailService.replyToEmailWithMultipartFiles(
        user.userId,
        params.id,
        replyData,
        files
      );

      // Cleanup uploaded files
      if (files && files.length > 0) {
        await this.fileUploadService.cleanupFiles(files);
      }

      return result;
    } catch (error) {
      // Cleanup on error
      if (files && files.length > 0) {
        await this.fileUploadService.cleanupFiles(files);
      }
      throw error;
    }
  }
}
