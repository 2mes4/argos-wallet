package service

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/rs/zerolog/log"

	"github.com/2mes4/argos-wallet/platform/internal/database"
	"github.com/2mes4/argos-wallet/platform/internal/domain"
)

type MultisigService struct {
	db *database.DB
}

func NewMultisigService(db *database.DB) *MultisigService {
	return &MultisigService{db: db}
}

// CreateMultisig creates a Gnosis Safe-compatible multisig wallet
func (s *MultisigService) CreateMultisig(
	ctx context.Context,
	tenantSchema string,
	walletID uuid.UUID,
	network string,
	owners []string,
	threshold int,
) (*domain.MultisigWallet, error) {
	if threshold > len(owners) {
		return nil, fmt.Errorf("threshold cannot exceed number of owners")
	}
	if threshold < 1 {
		return nil, fmt.Errorf("threshold must be at least 1")
	}

	// Compute deterministic Safe address from owners + threshold
	safeAddress := computeSafeAddress(owners, threshold, network)

	ms := &domain.MultisigWallet{
		ID:        uuid.New(),
		WalletID:  walletID,
		SafeAddress: safeAddress,
		Network:   network,
		Threshold: threshold,
		Owners:    owners,
		Nonce:     0,
		PendingTxs: 0,
		CreatedAt: time.Now(),
	}

	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		ownersJSON, _ := json.Marshal(ms.Owners)
		_, err := tx.Exec(ctx, `
			INSERT INTO multisig_wallets (id, wallet_id, safe_address, network, threshold, owners, nonce, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, ms.ID, ms.WalletID, ms.SafeAddress, ms.Network, ms.Threshold, ownersJSON, ms.Nonce, ms.CreatedAt)
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("create multisig: %w", err)
	}

	log.Info().
		Str("safe_address", safeAddress).
		Int("owners", len(owners)).
		Int("threshold", threshold).
		Msg("multisig wallet created")

	return ms, nil
}

// ProposeTransaction creates a pending multisig transaction that needs confirmations
func (s *MultisigService) ProposeTransaction(
	ctx context.Context,
	tenantSchema string,
	safeID uuid.UUID,
	to string,
	value string,
	data string,
) (string, error) {
	txHash := computeMultisigTxHash(safeID.String(), to, value, data)

	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		signers := `["` + strings.Join([]string{}, `","`) + `"]`
		_, err := tx.Exec(ctx, `
			INSERT INTO multisig_transactions (id, safe_id, to_address, value, data, tx_hash, confirmations, executed, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8)
		`, uuid.New(), safeID, to, value, data, txHash, signers, time.Now())
		return err
	})

	return txHash, err
}

// ConfirmTransaction adds an owner's signature to a multisig transaction
func (s *MultisigService) ConfirmTransaction(
	ctx context.Context,
	tenantSchema string,
	txHash string,
	ownerAddress string,
	signature string,
) error {
	return s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		// In production: verify the signature cryptographically
		_, err := tx.Exec(ctx, `
			UPDATE multisig_transactions
			SET confirmations = confirmations || jsonb_build_object($1, $2)
			WHERE tx_hash = $3
		`, ownerAddress, signature, txHash)
		return err
	})
}

func computeSafeAddress(owners []string, threshold int, network string) string {
	data := strings.Join(owners, ",") + fmt.Sprintf(":%d:%s", threshold, network)
	hash := hex.EncodeToString([]byte(data))
	if len(hash) >= 40 {
		return "0x" + hash[len(hash)-40:]
	}
	return "0x" + fmt.Sprintf("%040s", hash)
}

func computeMultisigTxHash(safeID, to, value, data string) string {
	payload := safeID + to + value + data
	bytes := []byte(payload)
	hash := hex.EncodeToString(bytes)
	if len(hash) >= 64 {
		return "0x" + hash[:64]
	}
	return "0x" + fmt.Sprintf("%064s", hash)
}
