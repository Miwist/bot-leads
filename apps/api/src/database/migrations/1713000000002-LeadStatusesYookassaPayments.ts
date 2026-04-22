import { MigrationInterface, QueryRunner } from "typeorm";

export class LeadStatusesYookassaPayments1713000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "leadStatuses" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );

    await queryRunner.query(
      `ALTER TABLE "leads" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" ALTER COLUMN "status" TYPE varchar(64) USING (
        CASE "status"::text
          WHEN 'NEW' THEN 'new'
          WHEN 'QUALIFIED' THEN 'qualified'
          WHEN 'ASSIGNED' THEN 'in_progress'
          WHEN 'PUSHED_TO_CRM' THEN 'won'
          WHEN 'FAILED' THEN 'lost'
          ELSE lower("status"::text)
        END
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'new'`,
    );

    await queryRunner.query(`DROP TYPE IF EXISTS "public"."leads_status_enum"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_payments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "companyId" varchar NOT NULL,
        "planCode" varchar,
        "months" integer,
        "amountRub" varchar NOT NULL,
        "currency" varchar NOT NULL DEFAULT 'RUB',
        "status" varchar NOT NULL DEFAULT 'pending',
        "yookassaPaymentId" varchar UNIQUE,
        "confirmationUrl" text,
        "returnUrl" text,
        "description" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_payments"`);
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN IF EXISTS "leadStatuses"`,
    );
  }
}
