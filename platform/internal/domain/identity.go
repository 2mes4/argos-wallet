package domain

import (
	"time"

	"github.com/google/uuid"
)

type ExternalConnection struct {
	ID            uuid.UUID  `json:"id"`
	WalletID      uuid.UUID  `json:"wallet_id"`
	Provider      string     `json:"provider"`
	Address       string     `json:"address"`
	ChainID       int        `json:"chain_id"`
	Metadata      string     `json:"metadata,omitempty"`
	ConnectedAt   time.Time  `json:"connected_at"`
	DisconnectedAt *time.Time `json:"disconnected_at,omitempty"`
}

type LinkExternalRequest struct {
	Provider  string `json:"provider" validate:"required"`
	Address   string `json:"address" validate:"required"`
	ChainID   int    `json:"chain_id" validate:"required"`
	Signature string `json:"signature,omitempty"`
}

type SignMessageRequest struct {
	WalletID uuid.UUID `json:"wallet_id" validate:"required"`
	Message  string    `json:"message" validate:"required"`
	Network  string    `json:"network,omitempty"`
}

type SignMessageResponse struct {
	Signature string `json:"signature"`
	Address   string `json:"address"`
}

type VerifySignatureRequest struct {
	Message   string `json:"message" validate:"required"`
	Signature string `json:"signature" validate:"required"`
	Address   string `json:"address" validate:"required"`
}

type VerifySignatureResponse struct {
	Valid bool `json:"valid"`
}

type SignTransactionRequest struct {
	WalletID uuid.UUID `json:"wallet_id" validate:"required"`
	Network  string    `json:"network" validate:"required"`
	To       string    `json:"to" validate:"required"`
	Value    string    `json:"value,omitempty"`
	Data     string    `json:"data,omitempty"`
}

type SignTransactionResponse struct {
	SignedTx string `json:"signed_tx"`
	TxHash   string `json:"tx_hash"`
}
