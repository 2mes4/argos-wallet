package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/rs/zerolog/log"

	"github.com/2mes4/argos-wallet/platform/internal/blockchain"
	"github.com/2mes4/argos-wallet/platform/internal/database"
	"github.com/2mes4/argos-wallet/platform/internal/domain"
	"github.com/2mes4/argos-wallet/platform/internal/repository"
)

type TransactionService struct {
	db     *database.DB
	txDB   *repository.TransactionRepo
	evm    *blockchain.EVMClient
	events chan<- domain.TransactionEvent
}

func NewTransactionService(db *database.DB, txDB *repository.TransactionRepo, evm *blockchain.EVMClient, events chan<- domain.TransactionEvent) *TransactionService {
	return &TransactionService{db: db, txDB: txDB, evm: evm, events: events}
}

func (s *TransactionService) Transfer(ctx context.Context, tenantSchema string, req domain.CreateTransferRequest) (*domain.Transaction, error) {
	privKey, err := s.evm.DerivePrivateKey(req.WalletID)
	if err != nil {
		return nil, fmt.Errorf("derive key: %w", err)
	}

	amount, err := s.evm.ToTokenAmount(req.Amount, 18)
	if err != nil {
		return nil, fmt.Errorf("parse amount: %w", err)
	}

	txHash, err := s.evm.TransferNative(ctx, req.Network, privKey, req.ToAddress, amount)
	if err != nil {
		return nil, fmt.Errorf("transfer: %w", err)
	}

	now := time.Now()
	tx := &domain.Transaction{
		ID:            uuid.New(),
		WalletID:      req.WalletID,
		Type:          domain.TxCryptoTransfer,
		Status:        domain.TxStatusPending,
		SourceNetwork: req.Network,
		SourceToken:   req.Token,
		SourceAmount:  req.Amount,
		ToAddress:     req.ToAddress,
		TxHash:        txHash,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	err = s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, dbtx pgx.Tx) error {
		return s.txDB.Create(ctx, dbtx, tx)
	})
	if err != nil {
		return nil, fmt.Errorf("save tx: %w", err)
	}

	s.emitEvent(tx, domain.TxStatusInitiated, domain.TxStatusPending)
	log.Info().Str("tx_id", tx.ID.String()).Str("tx_hash", txHash).Msg("transfer created")
	return tx, nil
}

func (s *TransactionService) ContractCall(ctx context.Context, tenantSchema string, req domain.CreateContractCallRequest) (*domain.Transaction, error) {
	now := time.Now()
	tx := &domain.Transaction{
		ID:              uuid.New(),
		WalletID:        req.WalletID,
		Type:            domain.TxSmartContract,
		Status:          domain.TxStatusInitiated,
		SourceNetwork:   req.Network,
		ContractAddress: req.ContractAddress,
		ContractMethod:  req.Method,
		ContractArgs:    req.Args,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, dbtx pgx.Tx) error {
		return s.txDB.Create(ctx, dbtx, tx)
	})
	if err != nil {
		return nil, fmt.Errorf("save tx: %w", err)
	}

	s.emitEvent(tx, "", domain.TxStatusInitiated)
	log.Info().Str("tx_id", tx.ID.String()).Msg("contract call created")
	return tx, nil
}

func (s *TransactionService) Get(ctx context.Context, tenantSchema string, txID uuid.UUID) (*domain.Transaction, error) {
	var tx *domain.Transaction
	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, dbtx pgx.Tx) error {
		var err error
		tx, err = s.txDB.GetByID(ctx, dbtx, txID)
		return err
	})
	return tx, err
}

func (s *TransactionService) List(ctx context.Context, tenantSchema string, filters domain.TransactionFilters) ([]domain.Transaction, error) {
	var txs []domain.Transaction
	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, dbtx pgx.Tx) error {
		var err error
		txs, err = s.txDB.List(ctx, dbtx, filters)
		return err
	})
	return txs, err
}

func (s *TransactionService) Cancel(ctx context.Context, tenantSchema string, txID uuid.UUID) (*domain.Transaction, error) {
	var tx *domain.Transaction

	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, dbtx pgx.Tx) error {
		var err error
		tx, err = s.txDB.GetByID(ctx, dbtx, txID)
		if err != nil {
			return err
		}

		if tx.Status != domain.TxStatusInitiated && tx.Status != domain.TxStatusPending {
			return fmt.Errorf("cannot cancel transaction in status %s", tx.Status)
		}

		oldStatus := tx.Status
		if err := s.txDB.UpdateStatus(ctx, dbtx, txID, domain.TxStatusCancelled, "", ""); err != nil {
			return err
		}

		tx.Status = domain.TxStatusCancelled
		s.emitEvent(tx, oldStatus, domain.TxStatusCancelled)
		return nil
	})
	return tx, err
}

func (s *TransactionService) GetByTxHash(ctx context.Context, txHash string) (*domain.Transaction, error) {
	return s.txDB.GetByTxHash(ctx, s.db.Pool, txHash)
}

func (s *TransactionService) UpdateStatus(ctx context.Context, tenantSchema string, txID uuid.UUID, status domain.TransactionStatus, txHash, errMsg string) error {
	var tx *domain.Transaction

	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, dbtx pgx.Tx) error {
		var err error
		tx, err = s.txDB.GetByID(ctx, dbtx, txID)
		if err != nil {
			return err
		}

		oldStatus := tx.Status
		if err := s.txDB.UpdateStatus(ctx, dbtx, txID, status, txHash, errMsg); err != nil {
			return err
		}

		tx.Status = status
		s.emitEvent(tx, oldStatus, status)
		return nil
	})
	return err
}

func (s *TransactionService) ListPending(ctx context.Context, tenantSchema string, limit int) ([]domain.Transaction, error) {
	var txs []domain.Transaction
	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, dbtx pgx.Tx) error {
		var err error
		txs, err = s.txDB.ListByStatus(ctx, dbtx, domain.TxStatusPending, limit)
		return err
	})
	return txs, err
}

func (s *TransactionService) CreateFromRouting(ctx context.Context, tenantSchema string, walletID uuid.UUID, ruleID uuid.UUID, txType domain.TransactionType, sourceNetwork, sourceToken, sourceAmount, toAddress string) (*domain.Transaction, error) {
	now := time.Now()
	tx := &domain.Transaction{
		ID:            uuid.New(),
		WalletID:      walletID,
		Type:          txType,
		Status:        domain.TxStatusInitiated,
		SourceNetwork: sourceNetwork,
		SourceToken:   sourceToken,
		SourceAmount:  sourceAmount,
		ToAddress:     toAddress,
		RuleID:        &ruleID,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, dbtx pgx.Tx) error {
		return s.txDB.Create(ctx, dbtx, tx)
	})
	if err != nil {
		return nil, err
	}

	s.emitEvent(tx, "", domain.TxStatusInitiated)
	return tx, nil
}

func (s *TransactionService) emitEvent(tx *domain.Transaction, oldStatus, newStatus domain.TransactionStatus) {
	if s.events != nil {
		select {
		case s.events <- domain.TransactionEvent{
			TransactionID: tx.ID,
			WalletID:      tx.WalletID,
			OldStatus:     oldStatus,
			NewStatus:     newStatus,
			Type:          tx.Type,
			Timestamp:     time.Now(),
		}:
		default:
		}
	}
}

func (s *TransactionService) FiatToCrypto(ctx context.Context, tenantSchema string, req domain.CreateFiatToCryptoRequest) (*domain.Transaction, error) {
	now := time.Now()
	tx := &domain.Transaction{
		ID:            uuid.New(),
		WalletID:      req.WalletID,
		Type:          domain.TxFiatToCrypto,
		Status:        domain.TxStatusInitiated,
		SourceNetwork: req.Network,
		SourceToken:   req.SourceCurrency,
		SourceAmount:  req.Amount,
		TargetNetwork: req.Network,
		TargetToken:   req.TargetCrypto,
		Metadata:      json.RawMessage(`{"bank_account_id":"` + req.BankAccountID + `"}`),
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, dbtx pgx.Tx) error {
		return s.txDB.Create(ctx, dbtx, tx)
	})
	if err != nil {
		return nil, err
	}

	s.emitEvent(tx, "", domain.TxStatusInitiated)
	return tx, nil
}

func (s *TransactionService) CryptoToFiat(ctx context.Context, tenantSchema string, req domain.CreateCryptoToFiatRequest) (*domain.Transaction, error) {
	now := time.Now()
	tx := &domain.Transaction{
		ID:            uuid.New(),
		WalletID:      req.WalletID,
		Type:          domain.TxCryptoToFiat,
		Status:        domain.TxStatusInitiated,
		SourceNetwork: req.Network,
		SourceToken:   req.CryptoSymbol,
		SourceAmount:  req.Amount,
		TargetToken:   req.TargetCurrency,
		Metadata:      json.RawMessage(`{"target_bank_account_id":"` + req.TargetBankAcctID + `"}`),
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, dbtx pgx.Tx) error {
		return s.txDB.Create(ctx, dbtx, tx)
	})
	if err != nil {
		return nil, err
	}

	s.emitEvent(tx, "", domain.TxStatusInitiated)
	return tx, nil
}
