import { HttpClient } from '../client';
import { RoutingRule, RuleExecution, CreateRuleParams } from '../types';

export class RoutingResource {
  constructor(private client: HttpClient) {}

  async createRule(params: CreateRuleParams): Promise<RoutingRule> {
    return this.client.post<RoutingRule>('/v1/routing/rules', params);
  }

  async getRule(ruleId: string): Promise<RoutingRule> {
    return this.client.get<RoutingRule>(`/v1/routing/rules/${ruleId}`);
  }

  async listRules(walletId: string): Promise<RoutingRule[]> {
    return this.client.get<RoutingRule[]>(`/v1/routing/rules?wallet_id=${walletId}`);
  }

  async updateRule(
    ruleId: string,
    params: Partial<CreateRuleParams>,
  ): Promise<RoutingRule> {
    return this.client.put<RoutingRule>(`/v1/routing/rules/${ruleId}`, params);
  }

  async deleteRule(ruleId: string): Promise<void> {
    return this.client.delete(`/v1/routing/rules/${ruleId}`);
  }

  async executeRule(ruleId: string): Promise<RuleExecution> {
    return this.client.post<RuleExecution>(`/v1/routing/rules/${ruleId}/execute`);
  }

  async listExecutions(ruleId: string): Promise<RuleExecution[]> {
    return this.client.get<RuleExecution[]>(`/v1/routing/rules/${ruleId}/executions`);
  }
}
