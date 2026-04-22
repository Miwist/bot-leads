import { MigrationInterface, QueryRunner } from "typeorm";

export class FeedbackMultiAttachments1713000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "feedback_messages" ADD COLUMN IF NOT EXISTS "attachments" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "feedback_messages" DROP COLUMN IF EXISTS "attachments"`,
    );
  }
}
