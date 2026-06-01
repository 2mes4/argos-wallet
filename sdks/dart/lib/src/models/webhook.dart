/// Webhook model for Argos Wallet.
class Webhook {
  final String id;
  final String url;
  final List<String> events;
  final bool active;
  final int failCount;
  final DateTime createdAt;

  const Webhook({
    required this.id,
    required this.url,
    required this.events,
    required this.active,
    required this.failCount,
    required this.createdAt,
  });

  factory Webhook.fromJson(Map<String, dynamic> json) {
    return Webhook(
      id: json['id'] as String,
      url: json['url'] as String,
      events: (json['events'] as List? ?? []).map((e) => e as String).toList(),
      active: json['active'] as bool? ?? true,
      failCount: json['fail_count'] as int? ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
