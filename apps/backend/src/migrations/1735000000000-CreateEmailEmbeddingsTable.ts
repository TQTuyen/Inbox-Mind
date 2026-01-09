import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateEmailEmbeddingsTable1735000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgvector extension
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');

    // Create email_embeddings table
    await queryRunner.createTable(
      new Table({
        name: 'email_embeddings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'emailId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'embedding',
            type: 'vector(768)', // 768-dimensional vector for Gemini text-embedding-004
            isNullable: false,
          },
          {
            name: 'embeddedText',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create unique index for userId + emailId
    await queryRunner.createIndex(
      'email_embeddings',
      new TableIndex({
        name: 'IDX_EMAIL_EMBEDDINGS_USER_EMAIL',
        columnNames: ['userId', 'emailId'],
        isUnique: true,
      })
    );

    // Create index on userId for batch operations
    await queryRunner.createIndex(
      'email_embeddings',
      new TableIndex({
        name: 'IDX_EMAIL_EMBEDDINGS_USER_ID',
        columnNames: ['userId'],
      })
    );

    // Create IVFFlat index for vector similarity search
    // Note: This should be created AFTER initial data load for better performance
    // lists=100 is a good starting point for ~10k-100k emails
    await queryRunner.query(`
      CREATE INDEX IDX_EMAIL_EMBEDDINGS_VECTOR
      ON email_embeddings
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'email_embeddings',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table (foreign keys and indexes are dropped automatically)
    await queryRunner.dropTable('email_embeddings');

    // Drop pgvector extension (only if not used by other tables)
    await queryRunner.query('DROP EXTENSION IF EXISTS vector');
  }
}
