import { MigrationInterface, QueryRunner } from "typeorm";

export class LeadDetailsFields1713000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "email" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "source" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "budget" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "comment" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "details" jsonb NOT NULL DEFAULT '{}'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "leads" DROP COLUMN IF EXISTS "details"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" DROP COLUMN IF EXISTS "comment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" DROP COLUMN IF EXISTS "budget"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" DROP COLUMN IF EXISTS "source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" DROP COLUMN IF EXISTS "email"`,
    );
  }
}
