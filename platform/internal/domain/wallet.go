package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type WalletStatus string

const (
	WalletStatusActive    WalletStatus = "active"
	WalletStatusSuspended WalletStatus = "suspended"
	WalletStatusDeleted   WalletStatus = "deleted"
)

type Wallet struct {
	ID         uuid.UUID          `json:"id"`
	ExternalID string             `json:"external_id,omitempty"`
	Status     WalletStatus       `json:"status"`
	Addresses  []WalletAddress    `json:"addresses,omitempty"`
	Balances   []Balance          `json:"balances,omitempty"`
	Metadata   json.RawMessage    `json:"metadata,omitempty"`
	CreatedAt  time.Time          `json:"created_at"`
	UpdatedAt  time.Time          `json:"updated_at"`
}

type WalletAddress struct {
	ID             uuid.UUID `json:"id"`
	WalletID       uuid.UUID `json:"wallet_id"`
	Network        string    `json:"network"`
	Address        string    `json:"address"`
	DerivationPath string    `json:"-"`
	IsDefault      bool      `json:"is_default"`
	CreatedAt      time.Time `json:"created_at"`
}

type Balance struct {
	Network  string `json:"network"`
	Token    string `json:"token"`
	Balance  string `json:"balance"`
	Decimals int    `json:"decimals"`
}

type CreateWalletRequest struct {
	ExternalID string          `json:"external_id,omitempty"`
	Networks   []string        `json:"networks,omitempty"`
	Metadata   json.RawMessage `json:"metadata,omitempty"`
}

type WalletResponse struct {
	ID         uuid.UUID                `json:"id"`
	ExternalID string                   `json:"external_id,omitempty"`
	Status     WalletStatus             `json:"status"`
	Addresses  map[string]string        `json:"addresses"`
	Balances   []Balance                `json:"balances"`
	Metadata   json.RawMessage          `json:"metadata,omitempty"`
	CreatedAt  time.Time                `json:"created_at"`
}
