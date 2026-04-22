import { MigrationInterface, QueryRunner } from "typeorm";

export class UserTelegramChatId1713000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegramChatId" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "telegramChatId"`,
    );
  }
}
