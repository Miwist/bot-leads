import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1713000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "public"."leads_status_enum" AS ENUM('NEW','QUALIFIED','ASSIGNED','PUSHED_TO_CRM','FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "users" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "email" varchar UNIQUE NOT NULL, "passwordHash" varchar NOT NULL, "role" varchar NOT NULL DEFAULT 'owner', "companyId" varchar, "createdAt" TIMESTAMP NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "companies" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "name" varchar NOT NULL, "slug" varchar UNIQUE NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "managers" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "companyId" varchar NOT NULL, "name" varchar NOT NULL, "email" varchar NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "rrOrder" integer NOT NULL DEFAULT 0, "createdAt" TIMESTAMP NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "bot_connections" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "companyId" varchar NOT NULL, "tokenEncrypted" varchar NOT NULL, "botUsername" varchar NOT NULL, "status" varchar NOT NULL DEFAULT 'active', "webhookSecret" varchar NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "conversations" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "companyId" varchar NOT NULL, "botConnectionId" varchar NOT NULL, "telegramUserId" varchar NOT NULL, "state" varchar, "context" jsonb NOT NULL DEFAULT '{}'::jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "leads" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "companyId" varchar NOT NULL, "conversationId" varchar NOT NULL, "fullName" varchar NOT NULL, "phone" varchar NOT NULL, "need" varchar NOT NULL, "status" "public"."leads_status_enum" NOT NULL DEFAULT 'NEW', "assignedManagerId" varchar, "createdAt" TIMESTAMP NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "lead_assignments" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "leadId" varchar NOT NULL, "companyId" varchar NOT NULL, "managerId" varchar NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "plans" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "code" varchar UNIQUE NOT NULL, "name" varchar NOT NULL, "monthlyLeadLimit" integer NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "subscriptions" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "companyId" varchar NOT NULL, "planCode" varchar NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "usage_counters" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "companyId" varchar NOT NULL, "monthKey" varchar NOT NULL, "leadsUsed" integer NOT NULL DEFAULT 0, "dialogsUsed" integer NOT NULL DEFAULT 0)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "audit_logs" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "companyId" varchar NOT NULL, "actor" varchar NOT NULL, "action" varchar NOT NULL, "payload" jsonb NOT NULL DEFAULT '{}'::jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `INSERT INTO plans (code, name, "monthlyLeadLimit") VALUES ('starter','Starter',100),('growth','Growth',300),('pro','Pro',1000) ON CONFLICT (code) DO NOTHING`,
    );
  }
  public async down(): Promise<void> {}
}
