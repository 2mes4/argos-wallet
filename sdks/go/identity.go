package openwallet

import (
	"fmt"

	"github.com/google/uuid"
)

type SignMessageResponse struct {
	Signature string `json:"signature"`
	Address   string `json:"address"`
}

type VerifySignatureResponse struct {
	Valid bool `json:"valid"`
}

type SignTransactionResponse struct {
	SignedTx string `json:"signed_tx"`
	TxHash   string `json:"tx_hash"`
}

type IdentityResource struct {
	client *Client
}

func (r *IdentityResource) SignMessage(walletID uuid.UUID, message string) (*SignMessageResponse, error) {
	var resp SignMessageResponse
	err := r.client.doJSON("POST", "/v1/identity/sign-message", map[string]interface{}{
		"wallet_id": walletID,
		"message":   message,
	}, &resp)
	return &resp, err
}

func (r *IdentityResource) VerifySignature(message, signature, address string) (*VerifySignatureResponse, error) {
	var resp VerifySignatureResponse
	err := r.client.doJSON("POST", "/v1/identity/verify-signature", map[string]interface{}{
		"message":   message,
		"signature": signature,
		"address":   address,
	}, &resp)
	return &resp, err
}

func (r *IdentityResource) SignTransaction(walletID uuid.UUID, network, to, value, data string) (*SignTransactionResponse, error) {
	var resp SignTransactionResponse
	err := r.client.doJSON("POST", "/v1/identity/sign-transaction", map[string]interface{}{
		"wallet_id": walletID,
		"network":   network,
		"to":        to,
		"value":     value,
		"data":      data,
	}, &resp)
	return &resp, err
}
