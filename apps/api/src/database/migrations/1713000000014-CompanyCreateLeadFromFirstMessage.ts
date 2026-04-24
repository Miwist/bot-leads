import { MigrationInterface, QueryRunner } from "typeorm";

export class CompanyCreateLeadFromFirstMessage1713000000014
  implements MigrationInterface
{
  name = "CompanyCreateLeadFromFirstMessage1713000000014";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "createLeadFromFirstMessage" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN IF EXISTS "createLeadFromFirstMessage"`,
    );
  }
}
