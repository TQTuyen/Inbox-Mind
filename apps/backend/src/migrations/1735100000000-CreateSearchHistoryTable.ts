import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateSearchHistoryTable1735100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create search_history table
    await queryRunner.createTable(
      new Table({
        name: 'search_history',
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
            name: 'query',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'searchedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create index for querying user's search history (ordered by time)
    await queryRunner.createIndex(
      'search_history',
      new TableIndex({
        name: 'IDX_SEARCH_HISTORY_USER_TIME',
        columnNames: ['userId', 'searchedAt'],
      })
    );

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'search_history',
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
    await queryRunner.dropTable('search_history');
  }
}
