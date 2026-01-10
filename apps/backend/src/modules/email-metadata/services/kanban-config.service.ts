import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KanbanConfig } from '../entities/kanban-config.entity';
import { GmailService } from '../../gmail/gmail.service';
import {
  CreateKanbanColumnDto,
  UpdateKanbanColumnDto,
  KanbanColumnDto,
} from '../dto/kanban-config.dto';

@Injectable()
export class KanbanConfigService {
  private readonly logger = new Logger(KanbanConfigService.name);

  constructor(
    @InjectRepository(KanbanConfig)
    private readonly kanbanConfigRepository: Repository<KanbanConfig>,
    @Inject(forwardRef(() => GmailService))
    private readonly gmailService: GmailService
  ) {}

  /**
   * Get user's Kanban configuration (all columns ordered by position)
   * Creates default columns if none exist
   */
  async getUserConfig(userId: string): Promise<KanbanColumnDto[]> {
    try {
      let columns = await this.kanbanConfigRepository.find({
        where: { userId },
        order: { position: 'ASC' },
      });

      // Initialize default columns if none exist
      if (columns.length === 0) {
        this.logger.log(
          `No columns found for user ${userId}, initializing defaults`
        );
        columns = await this.initializeDefaultColumns(userId);
      }

      this.logger.log(`Retrieved ${columns.length} columns for user ${userId}`);

      return columns.map((col) => this.toDto(col));
    } catch (error) {
      this.logger.error(
        `Failed to get user config for ${userId}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Create a new Kanban column
   */
  async createColumn(
    userId: string,
    dto: CreateKanbanColumnDto
  ): Promise<KanbanColumnDto> {
    this.logger.log(`Creating new column "${dto.title}" for user ${userId}`);

    // Generate columnId if not provided
    const columnId =
      dto.columnId ||
      `CUSTOM_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Check for duplicate columnId
    const existing = await this.kanbanConfigRepository.findOne({
      where: { userId, columnId },
    });

    if (existing) {
      throw new ConflictException(
        `Column with ID "${columnId}" already exists`
      );
    }

    // Create Gmail label if not provided
    let gmailLabelId = dto.gmailLabelId;
    if (!gmailLabelId) {
      try {
        const label = await this.gmailService.createLabel(userId, dto.title);
        gmailLabelId = label.id;
        this.logger.log(
          `Created Gmail label "${dto.title}" with ID ${gmailLabelId}`
        );
      } catch (error) {
        this.logger.error(`Failed to create Gmail label: ${error.message}`);
        throw new BadRequestException(
          `Failed to create Gmail label: ${error.message}`
        );
      }
    }

    // Get max position and add 1
    const maxPosition = await this.kanbanConfigRepository
      .createQueryBuilder('config')
      .select('MAX(config.position)', 'maxPosition')
      .where('config.userId = :userId', { userId })
      .getRawOne();

    const position = (maxPosition?.maxPosition ?? -1) + 1;

    // Create column
    const column = this.kanbanConfigRepository.create({
      userId,
      columnId,
      title: dto.title,
      gmailLabelId,
      position,
      color: dto.color,
    });

    const saved = await this.kanbanConfigRepository.save(column);

    this.logger.log(
      `Created column "${dto.title}" at position ${position} with Gmail label ${gmailLabelId}`
    );

    return this.toDto(saved);
  }

  /**
   * Update an existing Kanban column
   */
  async updateColumn(
    userId: string,
    columnId: string,
    dto: UpdateKanbanColumnDto
  ): Promise<KanbanColumnDto> {
    this.logger.log(`Updating column "${columnId}" for user ${userId}`);

    const column = await this.kanbanConfigRepository.findOne({
      where: { userId, columnId },
    });

    if (!column) {
      throw new NotFoundException(
        `Column "${columnId}" not found for user ${userId}`
      );
    }

    // Update title
    if (dto.title) {
      column.title = dto.title;

      // Optionally update Gmail label name
      if (dto.updateGmailLabel) {
        try {
          await this.gmailService.updateLabel(
            userId,
            column.gmailLabelId,
            dto.title
          );
          this.logger.log(
            `Updated Gmail label ${column.gmailLabelId} to "${dto.title}"`
          );
        } catch (error) {
          this.logger.error(`Failed to update Gmail label: ${error.message}`);
          // Continue anyway - database update should succeed even if Gmail fails
        }
      }
    }

    // Update color
    if (dto.color !== undefined) {
      column.color = dto.color;
    }

    const saved = await this.kanbanConfigRepository.save(column);

    this.logger.log(`Updated column "${columnId}"`);

    return this.toDto(saved);
  }

  /**
   * Delete a Kanban column
   */
  async deleteColumn(userId: string, columnId: string): Promise<void> {
    this.logger.log(`Deleting column "${columnId}" for user ${userId}`);

    // Prevent deletion of INBOX
    if (columnId === 'INBOX') {
      throw new BadRequestException('Cannot delete INBOX column');
    }

    const column = await this.kanbanConfigRepository.findOne({
      where: { userId, columnId },
    });

    if (!column) {
      throw new NotFoundException(
        `Column "${columnId}" not found for user ${userId}`
      );
    }

    // Delete the column
    await this.kanbanConfigRepository.delete({ userId, columnId });

    this.logger.log(`Deleted column "${columnId}"`);

    // Reorder remaining columns to fill the gap
    await this.reorderAfterDeletion(userId, column.position);
  }

  /**
   * Reorder Kanban columns
   */
  async reorderColumns(
    userId: string,
    columnIds: string[]
  ): Promise<KanbanColumnDto[]> {
    this.logger.log(
      `Reordering ${columnIds.length} columns for user ${userId}`
    );

    // Fetch all columns
    const columns = await this.kanbanConfigRepository.find({
      where: { userId },
    });

    // Create a map for quick lookup
    const columnMap = new Map(columns.map((col) => [col.columnId, col]));

    // Validate that all provided columnIds exist
    for (const columnId of columnIds) {
      if (!columnMap.has(columnId)) {
        throw new NotFoundException(
          `Column "${columnId}" not found for user ${userId}`
        );
      }
    }

    // Update positions
    const updates: Promise<KanbanConfig>[] = [];
    columnIds.forEach((columnId, index) => {
      const column = columnMap.get(columnId);
      if (column) {
        column.position = index;
        updates.push(this.kanbanConfigRepository.save(column));
      }
    });

    await Promise.all(updates);

    this.logger.log(`Reordered ${columnIds.length} columns`);

    // Return updated configuration
    return this.getUserConfig(userId);
  }

  /**
   * Reorder columns after deletion to fill gaps
   */
  private async reorderAfterDeletion(
    userId: string,
    deletedPosition: number
  ): Promise<void> {
    const columns = await this.kanbanConfigRepository.find({
      where: { userId },
      order: { position: 'ASC' },
    });

    // Update positions for columns after the deleted one
    const updates: Promise<KanbanConfig>[] = [];
    columns.forEach((column, index) => {
      if (column.position > deletedPosition) {
        column.position = index;
        updates.push(this.kanbanConfigRepository.save(column));
      }
    });

    await Promise.all(updates);

    this.logger.log(
      `Reordered ${updates.length} columns after deletion at position ${deletedPosition}`
    );
  }

  /**
   * Initialize default Kanban columns for a new user
   */
  private async initializeDefaultColumns(
    userId: string
  ): Promise<KanbanConfig[]> {
    this.logger.log(`Initializing default Kanban columns for user ${userId}`);

    const defaultColumns = [
      { columnId: 'INBOX', title: 'Inbox', position: 0 },
      { columnId: 'TODO', title: 'To Do', position: 1 },
      { columnId: 'IN_PROGRESS', title: 'In Progress', position: 2 },
      { columnId: 'DONE', title: 'Done', position: 3 },
    ];

    const createdColumns: KanbanConfig[] = [];

    for (const def of defaultColumns) {
      // Get or create Gmail label
      let gmailLabelId: string;

      // Check if gmailService is available (may be undefined during circular dependency resolution)
      if (!this.gmailService) {
        this.logger.warn(
          `GmailService not available during initialization, using fallback for "${def.title}"`
        );
        gmailLabelId = def.columnId;
      } else {
        try {
          // Try to get existing label first
          const labels = await this.gmailService.listLabels(userId);
          const existingLabel = labels.find((label) => label.name === def.title);

          if (existingLabel) {
            gmailLabelId = existingLabel.id;
            this.logger.log(
              `Using existing Gmail label "${def.title}" (${gmailLabelId})`
            );
          } else {
            // Create new label
            const newLabel = await this.gmailService.createLabel(
              userId,
              def.title
            );
            gmailLabelId = newLabel.id;
            this.logger.log(
              `Created Gmail label "${def.title}" (${gmailLabelId})`
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to get/create Gmail label for "${def.title}": ${error.message}`
          );
          // Use columnId as fallback
          gmailLabelId = def.columnId;
        }
      }

      // Create column in database
      const column = this.kanbanConfigRepository.create({
        userId,
        columnId: def.columnId,
        title: def.title,
        gmailLabelId,
        position: def.position,
        color: null, // Default color
      });

      const saved = await this.kanbanConfigRepository.save(column);
      createdColumns.push(saved);
    }

    this.logger.log(
      `Initialized ${createdColumns.length} default columns for user ${userId}`
    );

    return createdColumns;
  }

  /**
   * Convert entity to DTO
   */
  private toDto(entity: KanbanConfig): KanbanColumnDto {
    return {
      columnId: entity.columnId,
      title: entity.title,
      gmailLabelId: entity.gmailLabelId,
      position: entity.position,
      color: entity.color,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
