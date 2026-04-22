import { MigrationInterface, QueryRunner } from "typeorm";

export class DashboardEnhancements1713000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "botMode" varchar NOT NULL DEFAULT 'shared'`);
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "description" text`);
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "botObjective" text`);
    await queryRunner.query(`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "dataFields" jsonb NOT NULL DEFAULT '[]'::jsonb`);
    await queryRunner.query(`ALTER TABLE "managers" ADD COLUMN IF NOT EXISTS "chatId" varchar`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "managers" DROP COLUMN IF EXISTS "chatId"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "dataFields"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "botObjective"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "description"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN IF EXISTS "botMode"`);
  }
}
