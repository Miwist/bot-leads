import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Plan, Subscription, UsageCounter } from "../../database/entities";
import { Repository } from "typeorm";

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Plan) private plans: Repository<Plan>,
    @InjectRepository(Subscription) private subs: Repository<Subscription>,
    @InjectRepository(UsageCounter) private usage: Repository<UsageCounter>,
  ) {}

  async current(companyId: string) {
    const sub =
      (await this.subs.findOne({ where: { companyId, isActive: true } })) ||
      (await this.subs.save(this.subs.create({ companyId, planCode: "starter" })));
    const plan = await this.plans.findOne({ where: { code: sub.planCode } });
    const plans = await this.plans.find({ order: { monthlyLeadLimit: "ASC" } });
    const monthKey = new Date().toISOString().slice(0, 7);
    const usage =
      (await this.usage.findOne({ where: { companyId, monthKey } })) ||
      (await this.usage.save(this.usage.create({ companyId, monthKey })));
    return { plan, usage, subscription: sub, plans };
  }

  async changePlan(companyId: string, planCode: string) {
    const active = await this.subs.findOne({ where: { companyId, isActive: true } });
    if (active) {
      await this.subs.update({ id: active.id }, { planCode });
    } else {
      await this.subs.save(this.subs.create({ companyId, planCode, isActive: true }));
    }
    return this.current(companyId);
  }

  async canCreateLead(companyId: string) {
    const x = await this.current(companyId);
    return x.usage.leadsUsed < (x.plan?.monthlyLeadLimit || 100);
  }

  async incrementLead(companyId: string) {
    const monthKey = new Date().toISOString().slice(0, 7);
    const usage =
      (await this.usage.findOne({ where: { companyId, monthKey } })) ||
      this.usage.create({ companyId, monthKey });
    usage.leadsUsed += 1;
    await this.usage.save(usage);
  }
}
