import 'dart:convert';
import 'package:http/http.dart' as http;

class WalletConfig {
  final String apiKey;
  final String baseUrl;

  const WalletConfig({
    required this.apiKey,
    this.baseUrl = 'https://api.openwallet.dev',
  });
}

class WalletApiException implements Exception {
  final int statusCode;
  final String message;

  const WalletApiException({required this.statusCode, required this.message});

  @override
  String toString() => 'WalletApiException($statusCode): $message';
}

class OpenWalletClient {
  final WalletConfig config;
  final http.Client _client;

  late final WalletResource wallets;
  late final TransactionResource transactions;
  late final RoutingResource routing;
  late final IdentityResource identity;

  OpenWalletClient(this.config, {http.Client? client})
      : _client = client ?? http.Client() {
    wallets = WalletResource(this);
    transactions = TransactionResource(this);
    routing = RoutingResource(this);
    identity = IdentityResource(this);
  }

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('${config.baseUrl}$path');
    final headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${config.apiKey}',
      'X-API-Key': config.apiKey,
      'User-Agent': 'openwallet-sdk-dart/0.1.0',
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
      case 'PUT':
        response = await _client.put(
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
      throw WalletApiException(
        statusCode: response.statusCode,
        message: error['error'] ?? response.reasonPhrase ?? 'Unknown error',
      );
    }

    if (response.body.isEmpty) return {};
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> get(String path) => _request('GET', path);
  Future<Map<String, dynamic>> post(String path, [Map<String, dynamic>? body]) =>
      _request('POST', path, body: body);
  Future<Map<String, dynamic>> put(String path, [Map<String, dynamic>? body]) =>
      _request('PUT', path, body: body);
  Future<Map<String, dynamic>> delete(String path) => _request('DELETE', path);
}

abstract class Resource {
  final OpenWalletClient client;
  Resource(this.client);
}
