import { IsEnum } from 'class-validator';
import { KanbanStatus } from '../email-metadata.entity';

export class UpdateKanbanStatusDto {
  @IsEnum(['inbox', 'todo', 'in_progress', 'done', 'snoozed'])
  kanbanStatus: KanbanStatus;
}
