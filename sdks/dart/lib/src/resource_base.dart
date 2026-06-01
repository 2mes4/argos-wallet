/// Base class for API resources.
///
/// Uses `dynamic` for the client reference to avoid circular imports.
/// The client is expected to implement `get()`, `post()`, `delete()` methods.
abstract class ArgosResource {
  /// The client used to make API requests.
  final dynamic client;
  ArgosResource(this.client);
}
