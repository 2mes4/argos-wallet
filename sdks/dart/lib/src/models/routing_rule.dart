class RoutingRule {
  final String id;
  final String walletId;
  final String name;
  final String type;
  final int priority;
  final bool enabled;
  final Map<String, dynamic> conditions;
  final Map<String, dynamic> actions;
  final int executionCount;
  final DateTime createdAt;

  const RoutingRule({
    required this.id,
    required this.walletId,
    required this.name,
    required this.type,
    required this.priority,
    required this.enabled,
    required this.conditions,
    required this.actions,
    required this.executionCount,
    required this.createdAt,
  });

  factory RoutingRule.fromJson(Map<String, dynamic> json) {
    return RoutingRule(
      id: json['id'] as String,
      walletId: json['wallet_id'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      priority: json['priority'] as int,
      enabled: json['enabled'] as bool,
      conditions: json['conditions'] as Map<String, dynamic>,
      actions: json['actions'] as Map<String, dynamic>,
      executionCount: json['execution_count'] as int? ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}

class RuleExecution {
  final String id;
  final String ruleId;
  final String? transactionId;
  final String status;
  final String triggerReason;
  final DateTime executedAt;

  const RuleExecution({
    required this.id,
    required this.ruleId,
    this.transactionId,
    required this.status,
    required this.triggerReason,
    required this.executedAt,
  });

  factory RuleExecution.fromJson(Map<String, dynamic> json) {
    return RuleExecution(
      id: json['id'] as String,
      ruleId: json['rule_id'] as String,
      transactionId: json['transaction_id'] as String?,
      status: json['status'] as String,
      triggerReason: json['trigger_reason'] as String,
      executedAt: DateTime.parse(json['executed_at'] as String),
    );
  }
}
