import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateEmailMetadataTable1734000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'email_metadata',
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
            name: 'kanbanStatus',
            type: 'varchar',
            length: '50',
            isNullable: true,
            default: "'inbox'",
          },
          {
            name: 'snoozeUntil',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'summary',
            type: 'text',
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
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    // Create unique index for userId + emailId
    await queryRunner.createIndex(
      'email_metadata',
      new TableIndex({
        name: 'IDX_EMAIL_METADATA_USER_EMAIL',
        columnNames: ['userId', 'emailId'],
        isUnique: true,
      })
    );

    // Create index for snoozeUntil for efficient querying
    await queryRunner.createIndex(
      'email_metadata',
      new TableIndex({
        name: 'IDX_EMAIL_METADATA_SNOOZE_UNTIL',
        columnNames: ['snoozeUntil'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('email_metadata');
  }
}
