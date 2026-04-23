import { MigrationInterface, QueryRunner } from "typeorm";

export class CompanyOverageBalanceKopecks1713000000013 implements MigrationInterface {
  name = "CompanyOverageBalanceKopecks1713000000013";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "overageBalanceKopecks" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN IF EXISTS "overageBalanceKopecks"`,
    );
  }
}
