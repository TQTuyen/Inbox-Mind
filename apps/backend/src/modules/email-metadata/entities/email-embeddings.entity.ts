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
import { User } from '../../user/user.entity';

@Entity('email_embeddings')
@Index(['userId', 'emailId'], { unique: true })
export class EmailEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  emailId: string;

  // TODO: Switch to pgvector 'vector' type after installing pgvector extension in production
  // For now, using jsonb to store the embedding array for compatibility
  // Migration has vector(768) but production DB doesn't have pgvector extension yet
  @Column({
    type: 'jsonb',
  })
  embedding: number[];

  @Column({ type: 'text' })
  embeddedText: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
