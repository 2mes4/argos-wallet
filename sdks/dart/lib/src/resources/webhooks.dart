import '../resource_base.dart';
import '../models/webhook.dart';

/// Webhook management resource.
class WebhookResource extends ArgosResource {
  WebhookResource(super.client);

  /// Creates a new webhook endpoint.
  Future<Webhook> create({
    required String url,
    required List<String> events,
  }) async {
    final json = await client.post('/v1/webhooks', {
      'url': url,
      'events': events,
    });
    return Webhook.fromJson(json);
  }

  /// Lists all webhooks.
  Future<List<Webhook>> list() async {
    final json = await client.get('/v1/webhooks');
    final list = json as List? ?? [];
    return list.map((w) => Webhook.fromJson(w as Map<String, dynamic>)).toList();
  }

  /// Deletes a webhook.
  Future<void> delete(String webhookId) async {
    await client.delete('/v1/webhooks/$webhookId');
  }
}
