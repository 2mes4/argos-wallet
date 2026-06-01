package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/rs/zerolog/log"

	"github.com/2mes4/argos-wallet/platform/internal/database"
	"github.com/2mes4/argos-wallet/platform/internal/domain"
)

type HardwareWalletService struct {
	db *database.DB
}

func NewHardwareWalletService(db *database.DB) *HardwareWalletService {
	return &HardwareWalletService{db: db}
}

// Register links a hardware wallet (Ledger, Trezor) to a wallet
func (s *HardwareWalletService) Register(
	ctx context.Context,
	tenantSchema string,
	req domain.HardwareWallet,
) (*domain.HardwareWallet, error) {
	if req.DeviceType != domain.HardwareWalletLedger &&
		req.DeviceType != domain.HardwareWalletTrezor &&
		req.DeviceType != domain.HardwareWalletGridPlus {
		return nil, fmt.Errorf("unsupported device type: %s", req.DeviceType)
	}

	hw := &domain.HardwareWallet{
		ID:             uuid.New(),
		WalletID:       req.WalletID,
		DeviceType:     req.DeviceType,
		DeviceID:       req.DeviceID,
		DerivationPath: req.DerivationPath,
		Address:        req.Address,
		Network:        req.Network,
		Connected:      true,
		CreatedAt:      time.Now(),
	}
	now := time.Now()
	hw.LastSeen = &now

	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		_, err := tx.Exec(ctx, `
			INSERT INTO hardware_wallets (id, wallet_id, device_type, device_id, derivation_path, address, network, connected, last_seen, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`, hw.ID, hw.WalletID, hw.DeviceType, hw.DeviceID, hw.DerivationPath, hw.Address, hw.Network, hw.Connected, hw.LastSeen, hw.CreatedAt)
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("register hardware wallet: %w", err)
	}

	log.Info().
		Str("device_type", hw.DeviceType).
		Str("address", hw.Address).
		Msg("hardware wallet registered")

	return hw, nil
}

// SignWithHardware initiates a signing request to be approved on the device
func (s *HardwareWalletService) SignWithHardware(
	ctx context.Context,
	tenantSchema string,
	hwID uuid.UUID,
	message string,
) (string, error) {
	var deviceType, address string
	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		return tx.QueryRow(ctx,
			`SELECT device_type, address FROM hardware_wallets WHERE id = $1`,
			hwID,
		).Scan(&deviceType, &address)
	})
	if err != nil {
		return "", fmt.Errorf("hardware wallet not found: %w", err)
	}

	// In production: communicate with the device via USB/BLE
	// Ledger: use APDU commands via hidapi
	// Trezor: use protobuf messages via trezor-bridge
	// For now, we return a pending signature status

	pending := map[string]interface{}{
		"status":     "pending_device_approval",
		"device":     deviceType,
		"address":    address,
		"message":    message,
		"expires_at": time.Now().Add(5 * time.Minute),
	}
	payload, _ := json.Marshal(pending)
	return string(payload), nil
}

// List returns all registered hardware wallets for a tenant
func (s *HardwareWalletService) List(
	ctx context.Context,
	tenantSchema string,
	walletID uuid.UUID,
) ([]domain.HardwareWallet, error) {
	var wallets []domain.HardwareWallet
	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		rows, err := tx.Query(ctx,
			`SELECT id, wallet_id, device_type, device_id, derivation_path, address, network, connected, created_at FROM hardware_wallets WHERE wallet_id = $1`,
			walletID,
		)
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var hw domain.HardwareWallet
			if err := rows.Scan(&hw.ID, &hw.WalletID, &hw.DeviceType, &hw.DeviceID, &hw.DerivationPath, &hw.Address, &hw.Network, &hw.Connected, &hw.CreatedAt); err != nil {
				return err
			}
			wallets = append(wallets, hw)
		}
		return nil
	})
	return wallets, err
}
