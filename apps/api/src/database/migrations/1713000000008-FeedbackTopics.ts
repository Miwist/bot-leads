import { MigrationInterface, QueryRunner } from "typeorm";

export class FeedbackTopics1713000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "feedback_messages" ADD COLUMN IF NOT EXISTS "topic" varchar NOT NULL DEFAULT 'Общий вопрос'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_feedback_messages_company_topic_created" ON "feedback_messages" ("companyId", "topic", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_feedback_messages_company_topic_created"`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback_messages" DROP COLUMN IF EXISTS "topic"`,
    );
  }
}
