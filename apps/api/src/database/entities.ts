import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

export enum LeadStatus {
  NEW = "NEW",
  QUALIFIED = "QUALIFIED",
  ASSIGNED = "ASSIGNED",
  PUSHED_TO_CRM = "PUSHED_TO_CRM",
  FAILED = "FAILED",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ unique: true }) email: string;
  @Column() passwordHash: string;
  @Column({ default: "owner" }) role: string;
  @Column({ type: "varchar", nullable: true }) companyId: string | null;
  @CreateDateColumn() createdAt: Date;
}

@Entity("companies")
@Unique(["slug"])
export class Company {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column() name: string;
  @Column() slug: string;
  @Column({ default: true }) isActive: boolean;
  @Column({ type: "varchar", default: "shared" }) botMode: string;
  @Column({ type: "text", nullable: true }) description: string | null;
  @Column({ type: "text", nullable: true }) botObjective: string | null;
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  dataFields: string[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity("managers")
export class Manager {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column() companyId: string;
  @Column() name: string;
  @Column() email: string;
  @Column({ type: "varchar", nullable: true }) chatId: string | null;
  @Column({ default: true }) isActive: boolean;
  @Column({ default: 0 }) rrOrder: number;
  @CreateDateColumn() createdAt: Date;
}

@Entity("bot_connections")
export class BotConnection {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column() companyId: string;
  @Column() tokenEncrypted: string;
  @Column() botUsername: string;
  @Column({ default: "active" }) status: string;
  @Column() webhookSecret: string;
  @CreateDateColumn() createdAt: Date;
}

@Entity("conversations")
export class Conversation {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column() companyId: string;
  @Column() botConnectionId: string;
  @Column() telegramUserId: string;
  @Column({ type: "varchar", nullable: true }) state: string | null;
  @Column({ type: "jsonb", default: () => "'{}'::jsonb" })
  context: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
}

@Entity("leads")
export class Lead {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column() companyId: string;
  @Column() conversationId: string;
  @Column() fullName: string;
  @Column() phone: string;
  @Column() need: string;
  @Column({ type: "enum", enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;
  @Column({ type: "varchar", nullable: true })
  assignedManagerId: string | null;
  @CreateDateColumn() createdAt: Date;
}

@Entity("lead_assignments")
export class LeadAssignment {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column() leadId: string;
  @Column() companyId: string;
  @Column() managerId: string;
  @CreateDateColumn() createdAt: Date;
}

@Entity("plans")
export class Plan {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ unique: true }) code: string;
  @Column() name: string;
  @Column() monthlyLeadLimit: number;
}

@Entity("subscriptions")
export class Subscription {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column() companyId: string;
  @Column() planCode: string;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
}

@Entity("usage_counters")
export class UsageCounter {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column() companyId: string;
  @Column() monthKey: string;
  @Column({ default: 0 }) leadsUsed: number;
  @Column({ default: 0 }) dialogsUsed: number;
}

@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column() companyId: string;
  @Column() actor: string;
  @Column() action: string;
  @Column({ type: "jsonb", default: () => "'{}'::jsonb" })
  payload: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
}

export const entities = [
  User,
  Company,
  Manager,
  BotConnection,
  Conversation,
  Lead,
  LeadAssignment,
  Plan,
  Subscription,
  UsageCounter,
  AuditLog,
];
