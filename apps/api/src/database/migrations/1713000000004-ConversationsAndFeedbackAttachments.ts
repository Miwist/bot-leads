import { MigrationInterface, QueryRunner } from "typeorm";

export class ConversationsAndFeedbackAttachments1713000000004
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "conversation_messages" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "conversationId" varchar NOT NULL,
        "companyId" varchar NOT NULL,
        "role" varchar NOT NULL,
        "text" text NOT NULL,
        "attachments" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_conversation_messages_conversation_created" ON "conversation_messages" ("conversationId", "createdAt")`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback_messages" ADD COLUMN IF NOT EXISTS "attachmentName" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback_messages" ADD COLUMN IF NOT EXISTS "attachmentData" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "feedback_messages" DROP COLUMN IF EXISTS "attachmentData"`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback_messages" DROP COLUMN IF EXISTS "attachmentName"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_conversation_messages_conversation_created"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "conversation_messages"`);
  }
}
