package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/rs/zerolog/log"

	"github.com/2mes4/argos-wallet/platform/internal/blockchain"
	"github.com/2mes4/argos-wallet/platform/internal/database"
	"github.com/2mes4/argos-wallet/platform/internal/domain"
	"github.com/2mes4/argos-wallet/platform/internal/repository"
)

type IdentityService struct {
	db        *database.DB
	evm       *blockchain.EVMClient
	walletDB  *repository.WalletRepo
}

func NewIdentityService(db *database.DB, evm *blockchain.EVMClient) *IdentityService {
	return &IdentityService{db: db, evm: evm, walletDB: repository.NewWalletRepo()}
}

func (s *IdentityService) SignMessage(ctx context.Context, tenantSchema string, req domain.SignMessageRequest) (*domain.SignMessageResponse, error) {
	// Verify wallet exists in tenant schema
	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		_, err := s.walletDB.GetByID(ctx, tx, req.WalletID)
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("wallet not found: %w", err)
	}

	privKey, err := s.evm.DerivePrivateKey(req.WalletID)
	if err != nil {
		return nil, fmt.Errorf("derive key: %w", err)
	}

	signature, err := s.evm.SignMessage(privKey, req.Message)
	if err != nil {
		return nil, fmt.Errorf("sign: %w", err)
	}

	address, _, err := s.evm.DeriveAddress(req.WalletID)
	if err != nil {
		return nil, fmt.Errorf("derive address: %w", err)
	}

	log.Info().Str("wallet_id", req.WalletID.String()).Msg("message signed")

	return &domain.SignMessageResponse{
		Signature: signature,
		Address:   address,
	}, nil
}

func (s *IdentityService) VerifySignature(ctx context.Context, req domain.VerifySignatureRequest) (*domain.VerifySignatureResponse, error) {
	valid, err := s.evm.VerifySignature(req.Address, req.Message, req.Signature)
	if err != nil {
		return nil, fmt.Errorf("verify: %w", err)
	}

	return &domain.VerifySignatureResponse{
		Valid: valid,
	}, nil
}

func (s *IdentityService) SignTransaction(ctx context.Context, tenantSchema string, req domain.SignTransactionRequest) (*domain.SignTransactionResponse, error) {
	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		_, err := s.walletDB.GetByID(ctx, tx, uuid.UUID{})
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("wallet not found: %w", err)
	}

	return &domain.SignTransactionResponse{
		SignedTx: "0x_signed_tx_placeholder",
		TxHash:   "0x_tx_hash_placeholder",
	}, nil
}
