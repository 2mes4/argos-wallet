package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type ChainFamily string

const (
	ChainFamilyEVM    ChainFamily = "evm"
	ChainFamilySolana ChainFamily = "solana"
	ChainFamilyBitcoin ChainFamily = "bitcoin"
)

type SmartAccount struct {
	ID              uuid.UUID       `json:"id"`
	WalletID        uuid.UUID       `json:"wallet_id"`
	AccountAddress  string          `json:"account_address"`
	FactoryAddress  string          `json:"factory_address"`
	EntryPoint      string          `json:"entry_point"`
	Implementation  string          `json:"implementation"`
	Salt            string          `json:"salt"`
	OwnerAddress    string          `json:"owner_address"`
	GasSponsorshipConfig json.RawMessage `json:"gas_sponsorship_config,omitempty"`
	Deployed        bool            `json:"deployed"`
	Network         string          `json:"network"`
	CreatedAt       time.Time       `json:"created_at"`
}

type GasSponsorshipPolicy struct {
	ID              uuid.UUID       `json:"id"`
	TenantID        uuid.UUID       `json:"tenant_id"`
	Name            string          `json:"name"`
	PaymasterType   string          `json:"paymaster_type"`
	PaymasterAddress string         `json:"paymaster_address"`
	MaxGasPerTx     string          `json:"max_gas_per_tx"`
	DailyGasBudget  string          `json:"daily_gas_budget"`
	Enabled         bool            `json:"enabled"`
	Conditions      json.RawMessage `json:"conditions,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
}

type CreateSmartAccountRequest struct {
	WalletID  uuid.UUID `json:"wallet_id"`
	Network   string    `json:"network"`
	Salt      string    `json:"salt,omitempty"`
	Sponsored bool      `json:"sponsored"`
}

type MultisigWallet struct {
	ID             uuid.UUID    `json:"id"`
	WalletID       uuid.UUID    `json:"wallet_id"`
	SafeAddress    string       `json:"safe_address"`
	Network        string       `json:"network"`
	Threshold      int          `json:"threshold"`
	Owners         []string     `json:"owners"`
	Nonce          int          `json:"nonce"`
	PendingTxs     int          `json:"pending_txs"`
	CreatedAt      time.Time    `json:"created_at"`
}

type HardwareWallet struct {
	ID           uuid.UUID    `json:"id"`
	WalletID     uuid.UUID    `json:"wallet_id"`
	DeviceType   string       `json:"device_type"`
	DeviceID     string       `json:"device_id"`
	DerivationPath string     `json:"derivation_path"`
	Address      string       `json:"address"`
	Network      string       `json:"network"`
	Connected    bool         `json:"connected"`
	LastSeen     *time.Time   `json:"last_seen,omitempty"`
	CreatedAt    time.Time    `json:"created_at"`
}

const (
	HardwareWalletLedger = "ledger"
	HardwareWalletTrezor = "trezor"
	HardwareWalletGridPlus = "gridplus"
)

const (
	PaymasterTypeVerifying = "verifying"
	PaymasterTypeERC20     = "erc20_token"
	PaymasterTypeSponsor   = "sponsor"
)
