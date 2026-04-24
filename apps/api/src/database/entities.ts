import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ unique: true }) email: string;
  @Column() passwordHash: string;
  @Column({ default: false }) emailVerified: boolean;
  @Column({ type: "varchar", nullable: true }) emailVerificationTokenHash:
    | string
    | null;
  @Column({ type: "timestamp", nullable: true })
  emailVerificationExpiresAt: Date | null;
  @Column({ type: "varchar", nullable: true }) passwordResetTokenHash:
    | string
    | null;
  @Column({ type: "timestamp", nullable: true })
  passwordResetExpiresAt: Date | null;
  @Column({ default: "owner" }) role: string;
  @Column({ type: "varchar", nullable: true }) companyId: string | null;
  /** Числовой Telegram chat_id владельца/пользователя для уведомлений. */
  @Column({ type: "varchar", nullable: true }) telegramChatId: string | null;
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
  /** Тон общения ассистента (например: «сдержанно-деловой», «теплый»). */
  @Column({ type: "text", nullable: true }) communicationTone: string | null;
  /** Первое сообщение после /start — только для своего бота (не общий). */
  @Column({ type: "text", nullable: true }) welcomeMessage: string | null;
  /** Доп. инструкция для ИИ в диалоге (политика, табу, стиль). */
  @Column({ type: "text", nullable: true }) assistantInstruction: string | null;
  /** Подпись в общем боте, чтобы отличить компанию с похожим названием. */
  @Column({ type: "text", nullable: true }) clientDisambiguation: string | null;
  /** Создавать заявку сразу после первого сообщения клиента (после согласия). */
  @Column({ type: "boolean", default: false }) createLeadFromFirstMessage: boolean;
  @Column({ type: "varchar", default: "Europe/Moscow" }) timezone: string;
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  dataFields: string[];
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  botMaterials: Array<{
    id: string;
    title: string;
    fileName: string;
    mime: string;
    kind: string; // auto | photo | video | document | voice | video_note | group
    url: string;
    key?: string;
    groupId?: string | null;
  }>;
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  leadStatuses: {
    code: string;
    label: string;
    order: number;
    system?: boolean;
  }[];
  /** Предоплата за заявки сверх лимита (копейки). */
  @Column({ type: "int", default: 0 }) overageBalanceKopecks: number;
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

@Entity("conversation_messages")
export class ConversationMessage {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column() conversationId: string;
  @Column() companyId: string;
  @Column() role: string; // user | assistant | manager
  @Column({ type: "text" }) text: string;
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  attachments: Array<{ name?: string; data?: string }>;
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
  @Column({ type: "varchar", nullable: true }) email: string | null;
  @Column({ type: "varchar", nullable: true }) source: string | null;
  @Column({ type: "varchar", nullable: true }) budget: string | null;
  @Column({ type: "text", nullable: true }) comment: string | null;
  @Column({ type: "jsonb", default: () => "'{}'::jsonb" })
  details: Record<string, unknown>;
  @Column({ type: "varchar", length: 64, default: "new" })
  status: string;
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

@Entity("billing_payments")
export class BillingPayment {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column() companyId: string;
  @Column({ type: "varchar", nullable: true }) planCode: string | null;
  @Column({ type: "int", nullable: true }) months: number | null;
  @Column() amountRub: string;
  @Column({ default: "RUB" }) currency: string;
  @Column({ default: "pending" }) status: string;
  @Column({ type: "varchar", unique: true, nullable: true })
  yookassaPaymentId: string | null;
  @Column({ type: "text", nullable: true }) confirmationUrl: string | null;
  @Column({ type: "text", nullable: true }) returnUrl: string | null;
  @Column({ type: "text", nullable: true }) description: string | null;
  @CreateDateColumn() createdAt: Date;
}

@Entity("feedback_messages")
export class FeedbackMessage {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column() companyId: string;
  @Column({ type: "varchar", default: "Общий вопрос" }) topic: string;
  @Column() senderRole: string; // company | admin
  @Column({ type: "varchar", nullable: true }) senderUserId: string | null;
  @Column({ type: "text" }) text: string;
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  attachments: Array<{ name?: string; data?: string }>;
  @Column({ type: "varchar", nullable: true }) attachmentName: string | null;
  @Column({ type: "text", nullable: true }) attachmentData: string | null;
  @CreateDateColumn() createdAt: Date;
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
  ConversationMessage,
  Lead,
  LeadAssignment,
  Plan,
  Subscription,
  UsageCounter,
  BillingPayment,
  FeedbackMessage,
  AuditLog,
];
