import 'dart:convert';
import 'package:http/http.dart' as http;

import 'resources/wallets.dart';
import 'resources/transactions.dart';
import 'resources/routing.dart';
import 'resources/identity.dart';
import 'resources/webhooks.dart';
/// Configuration for the Argos Wallet API client.
class ArgosConfig {
  /// The API key for authentication.
  final String apiKey;

  /// The base URL of the Argos Wallet server.
  final String apiUrl;

  const ArgosConfig({
    required this.apiKey,
    this.apiUrl = 'http://localhost:8080',
  });
}

/// Exception thrown when an API request fails.
class ArgosApiException implements Exception {
  final int statusCode;
  final String message;

  const ArgosApiException({required this.statusCode, required this.message});

  @override
  String toString() => 'ArgosApiException($statusCode): $message';
}

/// The main client for interacting with the Argos Wallet API.
///
/// ```dart
/// final client = ArgosClient(
///   config: ArgosConfig(
///     apiKey: 'ow_your_api_key',
///     apiUrl: 'http://localhost:8080',
///   ),
/// );
///
/// final wallet = await client.wallets.create(
///   externalId: 'user-123',
///   networks: ['polygon'],
/// );
/// ```
class ArgosClient {
  final ArgosConfig config;
  final http.Client _client;

  /// Wallet management resource.
  late final WalletResource wallets;

  /// Transaction resource.
  late final TransactionResource transactions;

  /// Routing rules resource.
  late final RoutingResource routing;

  /// Identity signing resource.
  late final IdentityResource identity;

  /// Webhooks resource.
  late final WebhookResource webhooks;

  ArgosClient({required this.config, http.Client? client})
      : _client = client ?? http.Client() {
    wallets = WalletResource(this);
    transactions = TransactionResource(this);
    routing = RoutingResource(this);
    identity = IdentityResource(this);
    webhooks = WebhookResource(this);
  }

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? queryParams,
  }) async {
    var uri = Uri.parse('${config.apiUrl}$path');
    if (queryParams != null && queryParams.isNotEmpty) {
      uri = uri.replace(queryParameters: queryParams);
    }

    final headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${config.apiKey}',
      'X-API-Key': config.apiKey,
      'User-Agent': 'argos-wallet-sdk-dart/0.2.0',
    };

    late final http.Response response;
    switch (method) {
      case 'GET':
        response = await _client.get(uri, headers: headers);
        break;
      case 'POST':
        response = await _client.post(
          uri,
          headers: headers,
          body: body != null ? jsonEncode(body) : null,
        );
        break;
      case 'DELETE':
        response = await _client.delete(uri, headers: headers);
        break;
      default:
        throw ArgumentError('Unsupported method: $method');
    }

    if (response.statusCode >= 400) {
      final error = jsonDecode(response.body);
      throw ArgosApiException(
        statusCode: response.statusCode,
        message: error['error'] ?? response.reasonPhrase ?? 'Unknown error',
      );
    }

    if (response.body.isEmpty) return {};
    return jsonDecode(response.body);
  }

  /// Performs a GET request.
  Future<dynamic> get(String path, {Map<String, String>? queryParams}) =>
      _request('GET', path, queryParams: queryParams);

  /// Performs a POST request.
  Future<dynamic> post(String path, [Map<String, dynamic>? body]) =>
      _request('POST', path, body: body);

  /// Performs a DELETE request.
  Future<dynamic> delete(String path) => _request('DELETE', path);

  /// Closes the underlying HTTP client.
  void close() => _client.close();
}
