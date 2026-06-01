package service

import (
	"context"
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

type WalletService struct {
	db       *database.DB
	walletDB *repository.WalletRepo
	evm      *blockchain.EVMClient
	networks []string
}

func NewWalletService(db *database.DB, walletDB *repository.WalletRepo, evm *blockchain.EVMClient, networks []string) *WalletService {
	return &WalletService{db: db, walletDB: walletDB, evm: evm, networks: networks}
}

func (s *WalletService) Create(ctx context.Context, tenantSchema string, req domain.CreateWalletRequest) (*domain.WalletResponse, error) {
	walletID := uuid.New()
	now := time.Now()

	networks := s.networks
	if len(req.Networks) > 0 {
		networks = req.Networks
	}

	wallet := &domain.Wallet{
		ID:         walletID,
		ExternalID: req.ExternalID,
		Status:     domain.WalletStatusActive,
		Metadata:   req.Metadata,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	var addresses []domain.WalletAddress

	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		if err := s.walletDB.Create(ctx, tx, wallet); err != nil {
			return fmt.Errorf("create wallet: %w", err)
		}

		for _, network := range networks {
			address, _, err := s.evm.DeriveAddress(walletID)
			if err != nil {
				log.Error().Err(err).Str("network", network).Msg("derive address failed")
				continue
			}

			addr := &domain.WalletAddress{
				ID:        uuid.New(),
				WalletID:  walletID,
				Network:   network,
				Address:   address,
				IsDefault: true,
				CreatedAt: now,
			}
			if err := s.walletDB.AddAddress(ctx, tx, addr); err != nil {
				log.Error().Err(err).Str("network", network).Msg("save address failed")
			}
		}

		var err2 error
		addresses, err2 = s.walletDB.ListAddresses(ctx, tx, walletID)
		if err2 != nil {
			return err2
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	wallet.Addresses = addresses
	log.Info().Str("wallet_id", walletID.String()).Msg("wallet created")

	resp := s.walletDB.ToResponse(wallet)
	return &resp, nil
}

func (s *WalletService) Get(ctx context.Context, tenantSchema string, walletID uuid.UUID) (*domain.WalletResponse, error) {
	var wallet *domain.Wallet

	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		var err error
		wallet, err = s.walletDB.GetByID(ctx, tx, walletID)
		return err
	})
	if err != nil {
		return nil, err
	}

	balances, err := s.fetchBalances(ctx, wallet)
	if err != nil {
		log.Warn().Err(err).Str("wallet_id", walletID.String()).Msg("fetch balances failed")
	}
	wallet.Balances = balances

	resp := s.walletDB.ToResponse(wallet)
	return &resp, nil
}

func (s *WalletService) GetBalances(ctx context.Context, tenantSchema string, walletID uuid.UUID) ([]domain.Balance, error) {
	var wallet *domain.Wallet

	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		var err error
		wallet, err = s.walletDB.GetByID(ctx, tx, walletID)
		return err
	})
	if err != nil {
		return nil, err
	}

	return s.fetchBalances(ctx, wallet)
}

func (s *WalletService) GetAddresses(ctx context.Context, tenantSchema string, walletID uuid.UUID) ([]domain.WalletAddress, error) {
	var addrs []domain.WalletAddress
	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		var err error
		addrs, err = s.walletDB.ListAddresses(ctx, tx, walletID)
		return err
	})
	return addrs, err
}

func (s *WalletService) Deactivate(ctx context.Context, tenantSchema string, walletID uuid.UUID) error {
	return s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		return s.walletDB.UpdateStatus(ctx, tx, walletID, domain.WalletStatusSuspended)
	})
}

func (s *WalletService) LinkExternal(ctx context.Context, tenantSchema string, walletID uuid.UUID, req domain.LinkExternalRequest) (*domain.ExternalConnection, error) {
	conn := &domain.ExternalConnection{
		ID:          uuid.New(),
		WalletID:    walletID,
		Provider:    req.Provider,
		Address:     req.Address,
		ChainID:     req.ChainID,
		Metadata:    "{}",
		ConnectedAt: time.Now(),
	}

	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		wallet, err := s.walletDB.GetByID(ctx, tx, walletID)
		if err != nil {
			return err
		}
		if wallet.Status != domain.WalletStatusActive {
			return fmt.Errorf("wallet is not active")
		}
		return s.walletDB.CreateExternalConnection(ctx, tx, conn)
	})
	if err != nil {
		return nil, fmt.Errorf("link external: %w", err)
	}

	log.Info().Str("wallet_id", walletID.String()).Str("provider", req.Provider).Msg("external wallet linked")
	return conn, nil
}

func (s *WalletService) ListExternalConnections(ctx context.Context, tenantSchema string, walletID uuid.UUID) ([]domain.ExternalConnection, error) {
	var conns []domain.ExternalConnection
	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		var err error
		conns, err = s.walletDB.ListExternalConnections(ctx, tx, walletID)
		return err
	})
	return conns, err
}

func (s *WalletService) UnlinkExternal(ctx context.Context, tenantSchema string, connID uuid.UUID) error {
	return s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		return s.walletDB.DisconnectExternal(ctx, tx, connID)
	})
}

func (s *WalletService) fetchBalances(ctx context.Context, wallet *domain.Wallet) ([]domain.Balance, error) {
	balances := []domain.Balance{}
	for _, addr := range wallet.Addresses {
		nativeBal, err := s.evm.GetBalance(ctx, addr.Network, addr.Address)
		if err != nil {
			continue
		}
		if nativeBal.Sign() > 0 {
			balances = append(balances, domain.Balance{
				Network:  addr.Network,
				Token:    "native",
				Balance:  nativeBal.String(),
				Decimals: 18,
			})
		}
	}
	return balances, nil
}
