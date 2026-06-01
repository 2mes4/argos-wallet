import '../client.dart';
import '../models/routing_rule.dart';

class RoutingResource extends Resource {
  RoutingResource(super.client);

  Future<RoutingRule> createRule({
    required String walletId,
    required String name,
    required String type,
    required Map<String, dynamic> conditions,
    required Map<String, dynamic> actions,
    int? priority,
    bool? enabled,
  }) async {
    final json = await client.post('/v1/routing/rules', {
      'wallet_id': walletId,
      'name': name,
      'type': type,
      'conditions': conditions,
      'actions': actions,
      if (priority != null) 'priority': priority,
      if (enabled != null) 'enabled': enabled,
    });
    return RoutingRule.fromJson(json);
  }

  Future<RoutingRule> getRule(String ruleId) async {
    final json = await client.get('/v1/routing/rules/$ruleId');
    return RoutingRule.fromJson(json);
  }

  Future<List<RoutingRule>> listRules(String walletId) async {
    final json = await client.get('/v1/routing/rules?wallet_id=$walletId');
    final list = json as List? ?? [];
    return list.map((r) => RoutingRule.fromJson(r as Map<String, dynamic>)).toList();
  }

  Future<void> deleteRule(String ruleId) async {
    await client.delete('/v1/routing/rules/$ruleId');
  }

  Future<RuleExecution> executeRule(String ruleId) async {
    final json = await client.post('/v1/routing/rules/$ruleId/execute');
    return RuleExecution.fromJson(json);
  }
}
