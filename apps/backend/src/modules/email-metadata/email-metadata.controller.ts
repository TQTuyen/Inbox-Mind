import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from '../../common/decorators/current-user.decorator';
import { EmailMetadataService } from './services/email-metadata.service';
import { AIService } from '../ai/ai.service';
import { EmbeddingsService } from './services/embeddings.service';
import { GmailService } from '../gmail/gmail.service';
import { UpdateKanbanStatusDto } from './dto/update-kanban-status.dto';
import { SnoozeEmailDto } from './dto/snooze-email.dto';
import { GenerateSummaryDto } from './dto/generate-summary.dto';
import {
  SemanticSearchQueryDto,
  SemanticSearchResponseDto,
  GenerateEmbeddingsDto,
} from './dto/semantic-search.dto';
import {
  CreateKanbanColumnDto,
  UpdateKanbanColumnDto,
  ReorderKanbanColumnsDto,
  KanbanConfigResponseDto,
} from './dto/kanban-config.dto';
import { KanbanConfigService } from './services/kanban-config.service';

@ApiTags('email-metadata')
@Controller('email-metadata')
@UseGuards(JwtAuthGuard)
export class EmailMetadataController {
  constructor(
    private readonly emailMetadataService: EmailMetadataService,
    private readonly aiService: AIService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly gmailService: GmailService,
    private readonly kanbanConfigService: KanbanConfigService
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

  // ==================== Semantic Search Endpoints ====================

  @Post('embeddings/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate embeddings for emails in batch' })
  @ApiResponse({
    status: 200,
    description: 'Embeddings generated successfully',
  })
  async generateEmbeddings(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: GenerateEmbeddingsDto
  ) {
    if (!this.aiService.isAvailable()) {
      throw new BadRequestException(
        'AI service not available. Please configure GEMINI_API_KEY.'
      );
    }

    const embeddings = await this.embeddingsService.batchGenerateEmbeddings(
      user.userId,
      dto.emailIds
    );

    return {
      success: true,
      data: {
        generated: embeddings.length,
        emailIds: embeddings.map((e) => e.emailId),
      },
    };
  }

  @Get('search/semantic')
  @ApiOperation({
    summary: 'Semantic search using vector similarity',
    description:
      'Search emails by meaning, not just keywords. Uses AI embeddings for conceptual matching.',
  })
  @ApiResponse({ status: 200, type: SemanticSearchResponseDto })
  async semanticSearch(
    @CurrentUser() user: CurrentUserData,
    @Query() query: SemanticSearchQueryDto
  ): Promise<SemanticSearchResponseDto> {
    if (!this.aiService.isAvailable()) {
      throw new BadRequestException(
        'AI service not available. Please configure GEMINI_API_KEY.'
      );
    }

    // Perform semantic search
    const searchResults = await this.embeddingsService.semanticSearch(
      user.userId,
      query.query,
      query.limit || 10,
      query.threshold || 0.7
    );

    // Enrich results with full email metadata
    const emailIds = searchResults.map((r) => r.emailId);

    if (emailIds.length === 0) {
      return {
        results: [],
        total: 0,
        query: query.query,
      };
    }

    // Fetch email details for all results
    const emailDetailsPromises = emailIds.map((emailId) =>
      this.gmailService.getEmail(user.userId, emailId).catch((error) => {
        console.error(`Failed to fetch email ${emailId}:`, error);
        return null;
      })
    );

    const emails = (await Promise.all(emailDetailsPromises)).filter(
      (email) => email !== null
    );

    // Merge search results with email details
    const results = searchResults
      .map((result) => {
        const email = emails.find((e) => e.id === result.emailId);
        if (!email) return null;

        return {
          emailId: result.emailId,
          similarity: Math.round(result.similarity * 100) / 100, // Round to 2 decimals
          subject: email.subject || 'No Subject',
          preview: email.preview || email.snippet || '',
          from: email.from || { name: '', email: '' },
          timestamp: email.timestamp || email.internalDate || '',
          isRead: email.isRead || false,
        };
      })
      .filter((result) => result !== null);

    return {
      results,
      total: results.length,
      query: query.query,
    };
  }

  @Get('embeddings/stats')
  @ApiOperation({ summary: 'Get embedding statistics for current user' })
  async getEmbeddingStats(@CurrentUser() user: CurrentUserData) {
    const stats = await this.embeddingsService.getEmbeddingStats(user.userId);

    return {
      success: true,
      data: stats,
    };
  }

  // ==================== Kanban Configuration Endpoints ====================

  @Get('kanban/config')
  @ApiOperation({
    summary: 'Get user Kanban configuration',
    description:
      'Returns all Kanban columns for the user, ordered by position.',
  })
  @ApiResponse({ status: 200, type: KanbanConfigResponseDto })
  async getKanbanConfig(
    @CurrentUser() user: CurrentUserData
  ): Promise<KanbanConfigResponseDto> {
    if (!user || !user.userId) {
      throw new BadRequestException('User information not available');
    }

    console.log('🔵 [BACKEND] getKanbanConfig called for user:', user.userId);

    try {
      const columns = await this.kanbanConfigService.getUserConfig(user.userId);

      console.log('✅ [BACKEND] Retrieved columns:', columns.length);

      return {
        columns,
      };
    } catch (error) {
      console.error('❌ [BACKEND] Error in getKanbanConfig:', error);
      throw error;
    }
  }

  @Post('kanban/config/columns')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new Kanban column',
    description:
      'Creates a new Kanban column and optionally creates a Gmail label if not provided.',
  })
  @ApiResponse({ status: 201, description: 'Column created successfully' })
  async createKanbanColumn(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateKanbanColumnDto
  ) {
    const column = await this.kanbanConfigService.createColumn(
      user.userId,
      dto
    );

    return {
      success: true,
      data: column,
    };
  }

  @Put('kanban/config/columns/:columnId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an existing Kanban column',
    description:
      'Updates column title and/or color. Optionally updates the Gmail label name.',
  })
  @ApiResponse({ status: 200, description: 'Column updated successfully' })
  async updateKanbanColumn(
    @CurrentUser() user: CurrentUserData,
    @Param('columnId') columnId: string,
    @Body() dto: UpdateKanbanColumnDto
  ) {
    const column = await this.kanbanConfigService.updateColumn(
      user.userId,
      columnId,
      dto
    );

    return {
      success: true,
      data: column,
    };
  }

  @Delete('kanban/config/columns/:columnId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a Kanban column',
    description:
      'Deletes a Kanban column. INBOX column cannot be deleted. Remaining columns are automatically reordered.',
  })
  @ApiResponse({ status: 200, description: 'Column deleted successfully' })
  async deleteKanbanColumn(
    @CurrentUser() user: CurrentUserData,
    @Param('columnId') columnId: string
  ) {
    await this.kanbanConfigService.deleteColumn(user.userId, columnId);

    return {
      success: true,
      message: `Column "${columnId}" deleted successfully`,
    };
  }

  @Post('kanban/config/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reorder Kanban columns',
    description:
      'Updates the position of all columns based on the provided order.',
  })
  @ApiResponse({ status: 200, description: 'Columns reordered successfully' })
  async reorderKanbanColumns(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ReorderKanbanColumnsDto
  ) {
    const columns = await this.kanbanConfigService.reorderColumns(
      user.userId,
      dto.columnIds
    );

    return {
      success: true,
      data: {
        columns,
      },
    };
  }
}
