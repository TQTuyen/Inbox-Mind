import {
  Controller,
  Post,
  Put,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EmailMetadataService } from './email-metadata.service';
import { AIService } from '../ai/ai.service';
import { GmailService } from '../gmail/gmail.service';
import { UpdateKanbanStatusDto } from './dto/update-kanban-status.dto';
import { SnoozeEmailDto } from './dto/snooze-email.dto';

@Controller('api/email-metadata')
@UseGuards(JwtAuthGuard)
export class EmailMetadataController {
  constructor(
    private readonly emailMetadataService: EmailMetadataService,
    private readonly aiService: AIService,
    private readonly gmailService: GmailService
  ) {}

  @Put(':emailId/kanban-status')
  @HttpCode(HttpStatus.OK)
  async updateKanbanStatus(
    @CurrentUser() user: any,
    @Param('emailId') emailId: string,
    @Body() dto: UpdateKanbanStatusDto
  ) {
    const metadata = await this.emailMetadataService.updateKanbanStatus(
      user.id,
      emailId,
      dto.kanbanStatus
    );

    return {
      success: true,
      data: metadata,
    };
  }

  @Post(':emailId/snooze')
  @HttpCode(HttpStatus.OK)
  async snoozeEmail(
    @CurrentUser() user: any,
    @Param('emailId') emailId: string,
    @Body() dto: SnoozeEmailDto
  ) {
    const snoozeUntil = new Date(dto.snoozeUntil);

    if (snoozeUntil <= new Date()) {
      throw new BadRequestException('Snooze date must be in the future');
    }

    const metadata = await this.emailMetadataService.snoozeEmail(
      user.id,
      emailId,
      snoozeUntil
    );

    return {
      success: true,
      data: metadata,
    };
  }

  @Post(':emailId/unsnooze')
  @HttpCode(HttpStatus.OK)
  async unsnoozeEmail(
    @CurrentUser() user: any,
    @Param('emailId') emailId: string
  ) {
    const metadata = await this.emailMetadataService.unsnoozeEmail(
      user.id,
      emailId
    );

    return {
      success: true,
      data: metadata,
    };
  }

  @Post(':emailId/generate-summary')
  @HttpCode(HttpStatus.OK)
  async generateSummary(
    @CurrentUser() user: any,
    @Param('emailId') emailId: string
  ) {
    if (!this.aiService.isAvailable()) {
      throw new BadRequestException(
        'AI service not available. Please configure GEMINI_API_KEY.'
      );
    }

    // Fetch the email from Gmail
    const email = await this.gmailService.getEmail(user, emailId);

    if (!email) {
      throw new BadRequestException('Email not found');
    }

    // Generate summary
    const summary = await this.aiService.summarizeEmail(
      email.body,
      email.subject
    );

    // Save summary to database
    const metadata = await this.emailMetadataService.updateSummary(
      user.id,
      emailId,
      summary
    );

    return {
      success: true,
      data: {
        summary,
        metadata,
      },
    };
  }

  @Get(':emailId')
  async getMetadata(
    @CurrentUser() user: any,
    @Param('emailId') emailId: string
  ) {
    const metadata = await this.emailMetadataService.getMetadata(
      user.id,
      emailId
    );

    return {
      success: true,
      data: metadata,
    };
  }
}
