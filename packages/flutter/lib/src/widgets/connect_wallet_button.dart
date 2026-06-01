import 'package:flutter/material.dart';

class ConnectWalletButton extends StatefulWidget {
  final VoidCallback? onConnect;
  final VoidCallback? onDisconnect;
  final bool connected;
  final String? address;

  const ConnectWalletButton({
    super.key,
    this.onConnect,
    this.onDisconnect,
    this.connected = false,
    this.address,
  });

  @override
  State<ConnectWalletButton> createState() => _ConnectWalletButtonState();
}

class _ConnectWalletButtonState extends State<ConnectWalletButton> {
  String _truncateAddress(String addr) {
    if (addr.length <= 10) return addr;
    return '${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}';
  }

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      key: const Key('connect-wallet-btn'),
      onPressed: widget.connected ? widget.onDisconnect : widget.onConnect,
      child: Text(
        widget.connected
            ? _truncateAddress(widget.address ?? '')
            : 'Connect MetaMask',
      ),
    );
  }
}
