package openwallet

import (
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
)

type Wallet struct {
	ID         uuid.UUID       `json:"id"`
	ExternalID string          `json:"external_id,omitempty"`
	Status     string          `json:"status"`
	Addresses  map[string]string `json:"addresses"`
	Balances   []Balance       `json:"balances"`
	Metadata   json.RawMessage `json:"metadata,omitempty"`
	CreatedAt  string          `json:"created_at"`
}

type Balance struct {
	Network  string `json:"network"`
	Token    string `json:"token"`
	Balance  string `json:"balance"`
	Decimals int    `json:"decimals"`
}

type WalletAddress struct {
	ID        uuid.UUID `json:"id"`
	WalletID  uuid.UUID `json:"wallet_id"`
	Network   string    `json:"network"`
	Address   string    `json:"address"`
	IsDefault bool      `json:"is_default"`
}

type ExternalConnection struct {
	ID          uuid.UUID `json:"id"`
	WalletID    uuid.UUID `json:"wallet_id"`
	Provider    string    `json:"provider"`
	Address     string    `json:"address"`
	ChainID     int       `json:"chain_id"`
	ConnectedAt string    `json:"connected_at"`
}

type CreateWalletParams struct {
	ExternalID string          `json:"external_id,omitempty"`
	Networks   []string        `json:"networks,omitempty"`
	Metadata   json.RawMessage `json:"metadata,omitempty"`
}

type LinkExternalParams struct {
	Provider  string `json:"provider"`
	Address   string `json:"address"`
	ChainID   int    `json:"chain_id"`
	Signature string `json:"signature,omitempty"`
}

type WalletResource struct {
	client *Client
}

func (r *WalletResource) Create(params CreateWalletParams) (*Wallet, error) {
	var wallet Wallet
	err := r.client.doJSON("POST", "/v1/wallets", params, &wallet)
	return &wallet, err
}

func (r *WalletResource) Get(walletID uuid.UUID) (*Wallet, error) {
	var wallet Wallet
	err := r.client.doJSON("GET", fmt.Sprintf("/v1/wallets/%s", walletID), nil, &wallet)
	return &wallet, err
}

func (r *WalletResource) GetAddresses(walletID uuid.UUID) ([]WalletAddress, error) {
	var addrs []WalletAddress
	err := r.client.doJSON("GET", fmt.Sprintf("/v1/wallets/%s/addresses", walletID), nil, &addrs)
	return addrs, err
}

func (r *WalletResource) GetBalances(walletID uuid.UUID) ([]Balance, error) {
	var balances []Balance
	err := r.client.doJSON("GET", fmt.Sprintf("/v1/wallets/%s/balances", walletID), nil, &balances)
	return balances, err
}

func (r *WalletResource) Deactivate(walletID uuid.UUID) error {
	return r.client.doJSON("DELETE", fmt.Sprintf("/v1/wallets/%s", walletID), nil, nil)
}

func (r *WalletResource) LinkExternal(walletID uuid.UUID, params LinkExternalParams) (*ExternalConnection, error) {
	var conn ExternalConnection
	err := r.client.doJSON("POST", fmt.Sprintf("/v1/wallets/%s/connections", walletID), params, &conn)
	return &conn, err
}

func (r *WalletResource) ListConnections(walletID uuid.UUID) ([]ExternalConnection, error) {
	var conns []ExternalConnection
	err := r.client.doJSON("GET", fmt.Sprintf("/v1/wallets/%s/connections", walletID), nil, &conns)
	return conns, err
}

func (r *WalletResource) UnlinkExternal(walletID uuid.UUID, connectionID uuid.UUID) error {
	return r.client.doJSON("DELETE", fmt.Sprintf("/v1/wallets/%s/connections/%s", walletID, connectionID), nil, nil)
}
