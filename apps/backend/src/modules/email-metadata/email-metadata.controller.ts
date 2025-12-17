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
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { EmailMetadataService } from './email-metadata.service';
import { AIService } from '../ai/ai.service';
import { UpdateKanbanStatusDto } from './dto/update-kanban-status.dto';
import { SnoozeEmailDto } from './dto/snooze-email.dto';
import { GenerateSummaryDto } from './dto/generate-summary.dto';

@Controller('email-metadata')
@UseGuards(JwtAuthGuard)
export class EmailMetadataController {
  constructor(
    private readonly emailMetadataService: EmailMetadataService,
    private readonly aiService: AIService
  ) {}

  @Put(':emailId/kanban-status')
  @HttpCode(HttpStatus.OK)
  async updateKanbanStatus(
    @CurrentUser() user: CurrentUserData,
    @Param('emailId') emailId: string,
    @Body() dto: UpdateKanbanStatusDto
  ) {
    console.log('🔵 [BACKEND] updateKanbanStatus endpoint called:', {
      userId: user?.userId,
      emailId,
      kanbanStatus: dto.kanbanStatus,
    });

    const metadata = await this.emailMetadataService.updateKanbanStatus(
      user.userId,
      emailId,
      dto.kanbanStatus
    );

    console.log('✅ [BACKEND] Metadata saved successfully:', metadata);

    return {
      success: true,
      data: metadata,
    };
  }

  @Post(':emailId/snooze')
  @HttpCode(HttpStatus.OK)
  async snoozeEmail(
    @CurrentUser() user: CurrentUserData,
    @Param('emailId') emailId: string,
    @Body() dto: SnoozeEmailDto
  ) {
    const snoozeUntil = new Date(dto.snoozeUntil);

    if (snoozeUntil <= new Date()) {
      throw new BadRequestException('Snooze date must be in the future');
    }

    const metadata = await this.emailMetadataService.snoozeEmail(
      user.userId,
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
    @CurrentUser() user: CurrentUserData,
    @Param('emailId') emailId: string
  ) {
    const metadata = await this.emailMetadataService.unsnoozeEmail(
      user.userId,
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
    @CurrentUser() user: CurrentUserData,
    @Param('emailId') emailId: string,
    @Body() dto: GenerateSummaryDto
  ) {
    if (!this.aiService.isAvailable()) {
      throw new BadRequestException(
        'AI service not available. Please configure GEMINI_API_KEY.'
      );
    }

    if (!dto.emailBody) {
      throw new BadRequestException('Email body is required');
    }

    // Generate summary using provided email body and subject
    const summary = await this.aiService.summarizeEmail(
      dto.emailBody,
      dto.subject || 'No Subject'
    );

    // Save summary to database
    const metadata = await this.emailMetadataService.updateSummary(
      user.userId,
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
    @CurrentUser() user: CurrentUserData,
    @Param('emailId') emailId: string
  ) {
    const metadata = await this.emailMetadataService.getMetadata(
      user.userId,
      emailId
    );

    return {
      success: true,
      data: metadata,
    };
  }
}
