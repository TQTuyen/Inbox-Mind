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

  // Using pgvector extension for native vector type
  // The migration creates this as vector(768) type
  // TypeORM will serialize/deserialize number[] to/from PostgreSQL vector format
  @Column({
    type: 'vector',
    length: 768, // Match Gemini text-embedding-004 dimension
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
