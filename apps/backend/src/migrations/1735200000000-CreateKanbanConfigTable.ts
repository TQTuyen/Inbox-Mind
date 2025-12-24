import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateKanbanConfigTable1735200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create kanban_config table
    await queryRunner.createTable(
      new Table({
        name: 'kanban_config',
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
            name: 'columnId',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'gmailLabelId',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'position',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '50',
            isNullable: true,
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

    // Create unique index for userId + columnId
    await queryRunner.createIndex(
      'kanban_config',
      new TableIndex({
        name: 'IDX_KANBAN_CONFIG_USER_COLUMN',
        columnNames: ['userId', 'columnId'],
        isUnique: true,
      })
    );

    // Create index for ordering columns
    await queryRunner.createIndex(
      'kanban_config',
      new TableIndex({
        name: 'IDX_KANBAN_CONFIG_USER_POSITION',
        columnNames: ['userId', 'position'],
      })
    );

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'kanban_config',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    // Seed default Kanban columns for existing users
    await queryRunner.query(`
      INSERT INTO kanban_config ("userId", "columnId", title, "gmailLabelId", position)
      SELECT
        id as "userId",
        'INBOX' as "columnId",
        'Inbox' as title,
        'INBOX' as "gmailLabelId",
        0 as position
      FROM users
      UNION ALL
      SELECT
        id as "userId",
        'TODO' as "columnId",
        'To Do' as title,
        'TODO' as "gmailLabelId",
        1 as position
      FROM users
      UNION ALL
      SELECT
        id as "userId",
        'IN_PROGRESS' as "columnId",
        'In Progress' as title,
        'IN_PROGRESS' as "gmailLabelId",
        2 as position
      FROM users
      UNION ALL
      SELECT
        id as "userId",
        'DONE' as "columnId",
        'Done' as title,
        'DONE' as "gmailLabelId",
        3 as position
      FROM users
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table (foreign keys and indexes are dropped automatically)
    await queryRunner.dropTable('kanban_config');
  }
}
