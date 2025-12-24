import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity('kanban_config')
@Index(['userId', 'columnId'], { unique: true })
@Index(['userId', 'position'])
export class KanbanConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  columnId: string; // INBOX, TODO, CUSTOM_123, etc.

  @Column({ type: 'varchar', length: 100 })
  title: string; // Display name

  @Column({ type: 'varchar', length: 100 })
  gmailLabelId: string; // Associated Gmail label

  @Column({ type: 'int' })
  position: number; // Column order

  @Column({ type: 'varchar', length: 50, nullable: true })
  color: string; // Optional hex color

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
