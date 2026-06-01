package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/2mes4/argos-wallet/platform/internal/domain"
)

type TransactionRepo struct{}

func NewTransactionRepo() *TransactionRepo {
	return &TransactionRepo{}
}

func (r *TransactionRepo) Create(ctx context.Context, db DBTX, tx *domain.Transaction) error {
	_, err := db.Exec(ctx, `
		INSERT INTO transactions (
			id, wallet_id, type, status,
			source_network, source_token, source_amount,
			target_network, target_token, target_amount,
			to_address, tx_hash, fiat_transfer_id,
			contract_address, contract_method, contract_args,
			rule_id, error, metadata,
			created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
	`, tx.ID, tx.WalletID, tx.Type, tx.Status,
		tx.SourceNetwork, tx.SourceToken, tx.SourceAmount,
		tx.TargetNetwork, tx.TargetToken, tx.TargetAmount,
		tx.ToAddress, tx.TxHash, tx.FiatTransferID,
		tx.ContractAddress, tx.ContractMethod, tx.ContractArgs,
		tx.RuleID, tx.Error, tx.Metadata,
		tx.CreatedAt, tx.UpdatedAt)
	return err
}

func (r *TransactionRepo) GetByID(ctx context.Context, db DBTX, id uuid.UUID) (*domain.Transaction, error) {
	tx := &domain.Transaction{}
	err := db.QueryRow(ctx, `
		SELECT id, wallet_id, type, status,
			COALESCE(source_network,''), COALESCE(source_token,''), COALESCE(source_amount,''),
			COALESCE(target_network,''), COALESCE(target_token,''), COALESCE(target_amount,''),
			COALESCE(to_address,''), COALESCE(tx_hash,''), COALESCE(fiat_transfer_id,''),
			COALESCE(contract_address,''), COALESCE(contract_method,''), contract_args,
			rule_id, COALESCE(error,''), COALESCE(metadata,'{}'),
			created_at, updated_at
		FROM transactions WHERE id = $1
	`, id).Scan(&tx.ID, &tx.WalletID, &tx.Type, &tx.Status,
		&tx.SourceNetwork, &tx.SourceToken, &tx.SourceAmount,
		&tx.TargetNetwork, &tx.TargetToken, &tx.TargetAmount,
		&tx.ToAddress, &tx.TxHash, &tx.FiatTransferID,
		&tx.ContractAddress, &tx.ContractMethod, &tx.ContractArgs,
		&tx.RuleID, &tx.Error, &tx.Metadata,
		&tx.CreatedAt, &tx.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("transaction not found: %w", err)
	}
	return tx, nil
}

func (r *TransactionRepo) GetByTxHash(ctx context.Context, db DBTX, hash string) (*domain.Transaction, error) {
	tx := &domain.Transaction{}
	err := db.QueryRow(ctx, `
		SELECT id, wallet_id, type, status,
			COALESCE(source_network,''), COALESCE(source_token,''), COALESCE(source_amount,''),
			COALESCE(target_network,''), COALESCE(target_token,''), COALESCE(target_amount,''),
			COALESCE(to_address,''), COALESCE(tx_hash,''), COALESCE(fiat_transfer_id,''),
			COALESCE(contract_address,''), COALESCE(contract_method,''), contract_args,
			rule_id, COALESCE(error,''), COALESCE(metadata,'{}'),
			created_at, updated_at
		FROM transactions WHERE tx_hash = $1
	`, hash).Scan(&tx.ID, &tx.WalletID, &tx.Type, &tx.Status,
		&tx.SourceNetwork, &tx.SourceToken, &tx.SourceAmount,
		&tx.TargetNetwork, &tx.TargetToken, &tx.TargetAmount,
		&tx.ToAddress, &tx.TxHash, &tx.FiatTransferID,
		&tx.ContractAddress, &tx.ContractMethod, &tx.ContractArgs,
		&tx.RuleID, &tx.Error, &tx.Metadata,
		&tx.CreatedAt, &tx.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return tx, nil
}

func (r *TransactionRepo) UpdateStatus(ctx context.Context, db DBTX, id uuid.UUID, status domain.TransactionStatus, txHash, errMsg string) error {
	_, err := db.Exec(ctx, `
		UPDATE transactions SET status = $2, tx_hash = COALESCE($3, tx_hash), error = COALESCE($4, error), updated_at = $5
		WHERE id = $1
	`, id, status, nilIfEmpty(txHash), nilIfEmpty(errMsg), time.Now())
	return err
}

func (r *TransactionRepo) List(ctx context.Context, db DBTX, filters domain.TransactionFilters) ([]domain.Transaction, error) {
	query := `
		SELECT id, wallet_id, type, status,
			COALESCE(source_network,''), COALESCE(source_token,''), COALESCE(source_amount,''),
			COALESCE(target_network,''), COALESCE(target_token,''), COALESCE(target_amount,''),
			COALESCE(to_address,''), COALESCE(tx_hash,''), COALESCE(fiat_transfer_id,''),
			COALESCE(contract_address,''), COALESCE(contract_method,''), contract_args,
			rule_id, COALESCE(error,''), COALESCE(metadata,'{}'),
			created_at, updated_at
		FROM transactions WHERE 1=1
	`
	args := []interface{}{}
	argIdx := 1

	if filters.WalletID != nil {
		query += fmt.Sprintf(" AND wallet_id = $%d", argIdx)
		args = append(args, *filters.WalletID)
		argIdx++
	}
	if filters.Type != nil {
		query += fmt.Sprintf(" AND type = $%d", argIdx)
		args = append(args, *filters.Type)
		argIdx++
	}
	if filters.Status != nil {
		query += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, *filters.Status)
		argIdx++
	}

	query += " ORDER BY created_at DESC"

	if filters.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIdx)
		args = append(args, filters.Limit)
		argIdx++
	}
	if filters.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIdx)
		args = append(args, filters.Offset)
		argIdx++
	}

	rows, err := db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	txs := []domain.Transaction{}
	for rows.Next() {
		var tx domain.Transaction
		err := rows.Scan(&tx.ID, &tx.WalletID, &tx.Type, &tx.Status,
			&tx.SourceNetwork, &tx.SourceToken, &tx.SourceAmount,
			&tx.TargetNetwork, &tx.TargetToken, &tx.TargetAmount,
			&tx.ToAddress, &tx.TxHash, &tx.FiatTransferID,
			&tx.ContractAddress, &tx.ContractMethod, &tx.ContractArgs,
			&tx.RuleID, &tx.Error, &tx.Metadata,
			&tx.CreatedAt, &tx.UpdatedAt)
		if err != nil {
			return nil, err
		}
		txs = append(txs, tx)
	}
	return txs, nil
}

func (r *TransactionRepo) ListByStatus(ctx context.Context, db DBTX, status domain.TransactionStatus, limit int) ([]domain.Transaction, error) {
	query := `
		SELECT id, wallet_id, type, status,
			COALESCE(source_network,''), COALESCE(source_token,''), COALESCE(source_amount,''),
			COALESCE(target_network,''), COALESCE(target_token,''), COALESCE(target_amount,''),
			COALESCE(to_address,''), COALESCE(tx_hash,''), COALESCE(fiat_transfer_id,''),
			COALESCE(contract_address,''), COALESCE(contract_method,''), contract_args,
			rule_id, COALESCE(error,''), COALESCE(metadata,'{}'),
			created_at, updated_at
		FROM transactions WHERE status = $1
		ORDER BY created_at ASC LIMIT $2
	`
	rows, err := db.Query(ctx, query, status, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	txs := []domain.Transaction{}
	for rows.Next() {
		var tx domain.Transaction
		if err := rows.Scan(&tx.ID, &tx.WalletID, &tx.Type, &tx.Status,
			&tx.SourceNetwork, &tx.SourceToken, &tx.SourceAmount,
			&tx.TargetNetwork, &tx.TargetToken, &tx.TargetAmount,
			&tx.ToAddress, &tx.TxHash, &tx.FiatTransferID,
			&tx.ContractAddress, &tx.ContractMethod, &tx.ContractArgs,
			&tx.RuleID, &tx.Error, &tx.Metadata,
			&tx.CreatedAt, &tx.UpdatedAt); err != nil {
			return nil, err
		}
		txs = append(txs, tx)
	}
	return txs, nil
}

func nilIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func (r *TransactionRepo) StoreContractArgs(args json.RawMessage) interface{} {
	if args == nil {
		return nil
	}
	return args
}
