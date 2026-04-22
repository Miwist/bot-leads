import { MigrationInterface, QueryRunner } from "typeorm";

export class FeedbackMessages1713000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "feedback_messages" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "companyId" varchar NOT NULL,
        "senderRole" varchar NOT NULL,
        "senderUserId" varchar,
        "text" text NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_feedback_company_created" ON "feedback_messages" ("companyId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_feedback_company_created"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "feedback_messages"`);
  }
}
