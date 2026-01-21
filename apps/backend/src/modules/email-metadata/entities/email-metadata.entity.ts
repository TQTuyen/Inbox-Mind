import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';

/**
 * KanbanStatus is a flexible string type to allow custom user-defined statuses.
 * Users can create any status they want (not limited to predefined values).
 */
export type KanbanStatus = string;

@Entity('email_metadata')
@Index(['userId', 'emailId'], { unique: true })
@Index(['snoozeUntil'])
export class EmailMetadata {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  emailId: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    default: 'inbox',
  })
  kanbanStatus: KanbanStatus;

  @Column({ type: 'timestamp', nullable: true })
  snoozeUntil: Date | null;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
