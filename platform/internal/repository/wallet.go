package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/2mes4/argos-wallet/platform/internal/domain"
)

type WalletRepo struct{}

func NewWalletRepo() *WalletRepo {
	return &WalletRepo{}
}

func (r *WalletRepo) Create(ctx context.Context, db DBTX, w *domain.Wallet) error {
	_, err := db.Exec(ctx, `
		INSERT INTO wallets (id, external_id, status, metadata, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, w.ID, w.ExternalID, w.Status, w.Metadata, w.CreatedAt, w.UpdatedAt)
	return err
}

func (r *WalletRepo) GetByID(ctx context.Context, db DBTX, id uuid.UUID) (*domain.Wallet, error) {
	w := &domain.Wallet{}
	err := db.QueryRow(ctx, `
		SELECT id, COALESCE(external_id, ''), status, COALESCE(metadata, '{}'), created_at, updated_at
		FROM wallets WHERE id = $1
	`, id).Scan(&w.ID, &w.ExternalID, &w.Status, &w.Metadata, &w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("wallet not found: %w", err)
	}

	addrs, err := r.ListAddresses(ctx, db, id)
	if err == nil {
		w.Addresses = addrs
	}

	return w, nil
}

func (r *WalletRepo) GetByExternalID(ctx context.Context, db DBTX, externalID string) (*domain.Wallet, error) {
	w := &domain.Wallet{}
	err := db.QueryRow(ctx, `
		SELECT id, COALESCE(external_id, ''), status, COALESCE(metadata, '{}'), created_at, updated_at
		FROM wallets WHERE external_id = $1
	`, externalID).Scan(&w.ID, &w.ExternalID, &w.Status, &w.Metadata, &w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("wallet not found by external_id: %w", err)
	}
	return w, nil
}

func (r *WalletRepo) UpdateStatus(ctx context.Context, db DBTX, id uuid.UUID, status domain.WalletStatus) error {
	_, err := db.Exec(ctx, `
		UPDATE wallets SET status = $2, updated_at = $3 WHERE id = $1
	`, id, status, time.Now())
	return err
}

func (r *WalletRepo) AddAddress(ctx context.Context, db DBTX, addr *domain.WalletAddress) error {
	_, err := db.Exec(ctx, `
		INSERT INTO wallet_addresses (id, wallet_id, network, address, derivation_path, is_default, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, addr.ID, addr.WalletID, addr.Network, addr.Address, addr.DerivationPath, addr.IsDefault, addr.CreatedAt)
	return err
}

func (r *WalletRepo) ListAddresses(ctx context.Context, db DBTX, walletID uuid.UUID) ([]domain.WalletAddress, error) {
	rows, err := db.Query(ctx, `
		SELECT id, wallet_id, network, address, derivation_path, is_default, created_at
		FROM wallet_addresses WHERE wallet_id = $1 ORDER BY created_at
	`, walletID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	addrs := []domain.WalletAddress{}
	for rows.Next() {
		var a domain.WalletAddress
		err := rows.Scan(&a.ID, &a.WalletID, &a.Network, &a.Address, &a.DerivationPath, &a.IsDefault, &a.CreatedAt)
		if err != nil {
			return nil, err
		}
		addrs = append(addrs, a)
	}
	return addrs, nil
}

func (r *WalletRepo) GetAddressByNetwork(ctx context.Context, db DBTX, walletID uuid.UUID, network string) (*domain.WalletAddress, error) {
	a := &domain.WalletAddress{}
	err := db.QueryRow(ctx, `
		SELECT id, wallet_id, network, address, derivation_path, is_default, created_at
		FROM wallet_addresses WHERE wallet_id = $1 AND network = $2
	`, walletID, network).Scan(&a.ID, &a.WalletID, &a.Network, &a.Address, &a.DerivationPath, &a.IsDefault, &a.CreatedAt)
	if err != nil {
		return nil, err
	}
	return a, nil
}

func (r *WalletRepo) CreateExternalConnection(ctx context.Context, db DBTX, conn *domain.ExternalConnection) error {
	_, err := db.Exec(ctx, `
		INSERT INTO external_connections (id, wallet_id, provider, address, chain_id, metadata, connected_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, conn.ID, conn.WalletID, conn.Provider, conn.Address, conn.ChainID, conn.Metadata, conn.ConnectedAt)
	return err
}

func (r *WalletRepo) ListExternalConnections(ctx context.Context, db DBTX, walletID uuid.UUID) ([]domain.ExternalConnection, error) {
	rows, err := db.Query(ctx, `
		SELECT id, wallet_id, provider, address, chain_id, COALESCE(metadata, '{}'), connected_at, disconnected_at
		FROM external_connections WHERE wallet_id = $1 AND disconnected_at IS NULL
		ORDER BY connected_at DESC
	`, walletID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	conns := []domain.ExternalConnection{}
	for rows.Next() {
		var c domain.ExternalConnection
		err := rows.Scan(&c.ID, &c.WalletID, &c.Provider, &c.Address, &c.ChainID, &c.Metadata, &c.ConnectedAt, &c.DisconnectedAt)
		if err != nil {
			return nil, err
		}
		conns = append(conns, c)
	}
	return conns, nil
}

func (r *WalletRepo) DisconnectExternal(ctx context.Context, db DBTX, connID uuid.UUID) error {
	now := time.Now()
	_, err := db.Exec(ctx, `
		UPDATE external_connections SET disconnected_at = $2 WHERE id = $1
	`, connID, now)
	return err
}

func (r *WalletRepo) ToResponse(w *domain.Wallet) domain.WalletResponse {
	resp := domain.WalletResponse{
		ID:         w.ID,
		ExternalID: w.ExternalID,
		Status:     w.Status,
		Addresses:  make(map[string]string),
		Balances:   w.Balances,
		Metadata:   w.Metadata,
		CreatedAt:  w.CreatedAt,
	}
	for _, a := range w.Addresses {
		resp.Addresses[a.Network] = a.Address
	}
	return resp
}
