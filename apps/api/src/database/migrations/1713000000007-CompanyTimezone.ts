import { MigrationInterface, QueryRunner } from "typeorm";

export class CompanyTimezone1713000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "timezone" varchar NOT NULL DEFAULT 'Europe/Moscow'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN IF EXISTS "timezone"`,
    );
  }
}
