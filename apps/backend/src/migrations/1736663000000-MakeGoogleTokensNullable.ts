import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeGoogleTokensNullable1736663000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make googleRefreshToken and googleRefreshTokenIV nullable
    // This allows users to logout (revoke tokens) and login again without re-approval
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "googleRefreshToken" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "googleRefreshTokenIV" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: make columns NOT NULL again
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "googleRefreshToken" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "googleRefreshTokenIV" SET NOT NULL
    `);
  }
}
