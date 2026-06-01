package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type TransactionType string

const (
	TxCryptoTransfer  TransactionType = "crypto_transfer"
	TxFiatToCrypto    TransactionType = "fiat_to_crypto"
	TxCryptoToFiat    TransactionType = "crypto_to_fiat"
	TxSmartContract   TransactionType = "smart_contract"
	TxRoutingExecution TransactionType = "routing_execution"
)

type TransactionStatus string

const (
	TxStatusInitiated    TransactionStatus = "initiated"
	TxStatusPending      TransactionStatus = "pending"
	TxStatusConfirming   TransactionStatus = "confirming"
	TxStatusCompleted    TransactionStatus = "completed"
	TxStatusFailed       TransactionStatus = "failed"
	TxStatusCancelled    TransactionStatus = "cancelled"
	TxStatusExpired      TransactionStatus = "expired"
)

type Transaction struct {
	ID              uuid.UUID          `json:"id"`
	WalletID        uuid.UUID          `json:"wallet_id"`
	Type            TransactionType    `json:"type"`
	Status          TransactionStatus  `json:"status"`
	SourceNetwork   string             `json:"source_network,omitempty"`
	SourceToken     string             `json:"source_token,omitempty"`
	SourceAmount    string             `json:"source_amount,omitempty"`
	TargetNetwork   string             `json:"target_network,omitempty"`
	TargetToken     string             `json:"target_token,omitempty"`
	TargetAmount    string             `json:"target_amount,omitempty"`
	ToAddress       string             `json:"to_address,omitempty"`
	TxHash          string             `json:"tx_hash,omitempty"`
	FiatTransferID  string             `json:"fiat_transfer_id,omitempty"`
	ContractAddress string             `json:"contract_address,omitempty"`
	ContractMethod  string             `json:"contract_method,omitempty"`
	ContractArgs    json.RawMessage    `json:"contract_args,omitempty"`
	RuleID          *uuid.UUID         `json:"rule_id,omitempty"`
	Error           string             `json:"error,omitempty"`
	Metadata        json.RawMessage    `json:"metadata,omitempty"`
	CreatedAt       time.Time          `json:"created_at"`
	UpdatedAt       time.Time          `json:"updated_at"`
}

type CreateTransferRequest struct {
	WalletID  uuid.UUID `json:"wallet_id" validate:"required"`
	Network   string    `json:"network" validate:"required"`
	Token     string    `json:"token" validate:"required"`
	Amount    string    `json:"amount" validate:"required"`
	ToAddress string    `json:"to_address" validate:"required"`
}

type CreateFiatToCryptoRequest struct {
	WalletID       uuid.UUID `json:"wallet_id" validate:"required"`
	Amount         string    `json:"amount" validate:"required"`
	SourceCurrency string    `json:"source_currency" validate:"required"`
	TargetCrypto   string    `json:"target_crypto" validate:"required"`
	Network        string    `json:"network" validate:"required"`
	BankAccountID  string    `json:"bank_account_id,omitempty"`
}

type CreateCryptoToFiatRequest struct {
	WalletID        uuid.UUID `json:"wallet_id" validate:"required"`
	Network         string    `json:"network" validate:"required"`
	CryptoSymbol    string    `json:"crypto_symbol" validate:"required"`
	Amount          string    `json:"amount" validate:"required"`
	TargetCurrency  string    `json:"target_currency" validate:"required"`
	TargetBankAcctID string   `json:"target_bank_account_id" validate:"required"`
}

type CreateContractCallRequest struct {
	WalletID        uuid.UUID       `json:"wallet_id" validate:"required"`
	Network         string          `json:"network" validate:"required"`
	ContractAddress string          `json:"contract_address" validate:"required"`
	ABI             json.RawMessage `json:"abi" validate:"required"`
	Method          string          `json:"method" validate:"required"`
	Args            json.RawMessage `json:"args,omitempty"`
	Value           string          `json:"value,omitempty"`
}

type TransactionFilters struct {
	WalletID *uuid.UUID        `json:"wallet_id,omitempty"`
	Type     *TransactionType  `json:"type,omitempty"`
	Status   *TransactionStatus `json:"status,omitempty"`
	Network  *string           `json:"network,omitempty"`
	Limit    int               `json:"limit,omitempty"`
	Offset   int               `json:"offset,omitempty"`
}

type DepositInstructions struct {
	IBAN      string `json:"iban,omitempty"`
	Reference string `json:"reference"`
	Amount    string `json:"amount"`
	Currency  string `json:"currency"`
	BankName  string `json:"bank_name,omitempty"`
}

type TransactionEvent struct {
	TransactionID uuid.UUID         `json:"transaction_id"`
	WalletID      uuid.UUID         `json:"wallet_id"`
	OldStatus     TransactionStatus `json:"old_status"`
	NewStatus     TransactionStatus `json:"new_status"`
	Type          TransactionType   `json:"type"`
	Timestamp     time.Time         `json:"timestamp"`
}
