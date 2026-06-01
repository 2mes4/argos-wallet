import '../resource_base.dart';

class IdentityResource extends ArgosResource {
  IdentityResource(super.client);

  Future<SignMessageResponse> signMessage(String walletId, String message) async {
    final json = await client.post('/v1/identity/sign-message', {
      'wallet_id': walletId,
      'message': message,
    });
    return SignMessageResponse(
      signature: json['signature'] as String,
      address: json['address'] as String,
    );
  }

  Future<bool> verifySignature(
    String message,
    String signature,
    String address,
  ) async {
    final json = await client.post('/v1/identity/verify-signature', {
      'message': message,
      'signature': signature,
      'address': address,
    });
    return json['valid'] as bool;
  }
}

class SignMessageResponse {
  final String signature;
  final String address;

  const SignMessageResponse({required this.signature, required this.address});
}
