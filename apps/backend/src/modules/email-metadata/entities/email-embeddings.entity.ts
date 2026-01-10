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

  // TODO: Install pgvector extension to use native vector type for better performance
  // For now, using jsonb to store the embedding array
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
