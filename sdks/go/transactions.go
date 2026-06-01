package openwallet

import (
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
)

type Transaction struct {
	ID              uuid.UUID       `json:"id"`
	WalletID        uuid.UUID       `json:"wallet_id"`
	Type            string          `json:"type"`
	Status          string          `json:"status"`
	SourceNetwork   string          `json:"source_network,omitempty"`
	SourceToken     string          `json:"source_token,omitempty"`
	SourceAmount    string          `json:"source_amount,omitempty"`
	TargetNetwork   string          `json:"target_network,omitempty"`
	TargetToken     string          `json:"target_token,omitempty"`
	TargetAmount    string          `json:"target_amount,omitempty"`
	ToAddress       string          `json:"to_address,omitempty"`
	TxHash          string          `json:"tx_hash,omitempty"`
	ContractAddress string          `json:"contract_address,omitempty"`
	ContractMethod  string          `json:"contract_method,omitempty"`
	Error           string          `json:"error,omitempty"`
	CreatedAt       string          `json:"created_at"`
	UpdatedAt       string          `json:"updated_at"`
}

type TransferParams struct {
	WalletID  uuid.UUID `json:"wallet_id"`
	Network   string    `json:"network"`
	Token     string    `json:"token"`
	Amount    string    `json:"amount"`
	ToAddress string    `json:"to_address"`
}

type FiatToCryptoParams struct {
	WalletID       uuid.UUID `json:"wallet_id"`
	Amount         string    `json:"amount"`
	SourceCurrency string    `json:"source_currency"`
	TargetCrypto   string    `json:"target_crypto"`
	Network        string    `json:"network"`
	BankAccountID  string    `json:"bank_account_id,omitempty"`
}

type CryptoToFiatParams struct {
	WalletID         uuid.UUID `json:"wallet_id"`
	Network          string    `json:"network"`
	CryptoSymbol     string    `json:"crypto_symbol"`
	Amount           string    `json:"amount"`
	TargetCurrency   string    `json:"target_currency"`
	TargetBankAcctID string    `json:"target_bank_account_id"`
}

type ContractCallParams struct {
	WalletID        uuid.UUID       `json:"wallet_id"`
	Network         string          `json:"network"`
	ContractAddress string          `json:"contract_address"`
	ABI             json.RawMessage `json:"abi"`
	Method          string          `json:"method"`
	Args            json.RawMessage `json:"args,omitempty"`
	Value           string          `json:"value,omitempty"`
}

type ListTransactionsParams struct {
	WalletID *uuid.UUID
	Type     *string
	Status   *string
	Limit    *int
	Offset   *int
}

type TransactionResource struct {
	client *Client
}

func (r *TransactionResource) Transfer(params TransferParams) (*Transaction, error) {
	var tx Transaction
	err := r.client.doJSON("POST", "/v1/transactions/transfer", params, &tx)
	return &tx, err
}

func (r *TransactionResource) FiatToCrypto(params FiatToCryptoParams) (*Transaction, error) {
	var tx Transaction
	err := r.client.doJSON("POST", "/v1/transactions/fiat-to-crypto", params, &tx)
	return &tx, err
}

func (r *TransactionResource) CryptoToFiat(params CryptoToFiatParams) (*Transaction, error) {
	var tx Transaction
	err := r.client.doJSON("POST", "/v1/transactions/crypto-to-fiat", params, &tx)
	return &tx, err
}

func (r *TransactionResource) ContractCall(params ContractCallParams) (*Transaction, error) {
	var tx Transaction
	err := r.client.doJSON("POST", "/v1/transactions/contract-call", params, &tx)
	return &tx, err
}

func (r *TransactionResource) Get(txID uuid.UUID) (*Transaction, error) {
	var tx Transaction
	err := r.client.doJSON("GET", fmt.Sprintf("/v1/transactions/%s", txID), nil, &tx)
	return &tx, err
}

func (r *TransactionResource) List(params ListTransactionsParams) ([]Transaction, error) {
	path := "/v1/transactions?"
	if params.WalletID != nil {
		path += fmt.Sprintf("wallet_id=%s&", params.WalletID)
	}
	if params.Type != nil {
		path += fmt.Sprintf("type=%s&", *params.Type)
	}
	if params.Status != nil {
		path += fmt.Sprintf("status=%s&", *params.Status)
	}
	if params.Limit != nil {
		path += fmt.Sprintf("limit=%d&", *params.Limit)
	}
	if params.Offset != nil {
		path += fmt.Sprintf("offset=%d&", *params.Offset)
	}

	var txs []Transaction
	err := r.client.doJSON("GET", path, nil, &txs)
	return txs, err
}

func (r *TransactionResource) Cancel(txID uuid.UUID) (*Transaction, error) {
	var tx Transaction
	err := r.client.doJSON("POST", fmt.Sprintf("/v1/transactions/%s/cancel", txID), nil, &tx)
	return &tx, err
}
