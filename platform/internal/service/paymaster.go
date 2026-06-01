package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/rs/zerolog/log"

	"github.com/2mes4/argos-wallet/platform/internal/blockchain"
	"github.com/2mes4/argos-wallet/platform/internal/database"
	"github.com/2mes4/argos-wallet/platform/internal/domain"
)

type PaymasterService struct {
	db  *database.DB
	aa  *blockchain.AccountAbstractionClient
}

func NewPaymasterService(db *database.DB, aa *blockchain.AccountAbstractionClient) *PaymasterService {
	return &PaymasterService{db: db, aa: aa}
}

// CreateSponsoredTransaction creates a UserOperation with gas sponsorship
func (s *PaymasterService) CreateSponsoredTransaction(
	ctx context.Context,
	tenantSchema string,
	req domain.CreateSmartAccountRequest,
	callData string,
) (*blockchain.UserOperation, error) {
	// Generate smart account address
	owner := "0x0000000000000000000000000000000000000000"
	salt := big.NewInt(time.Now().Unix())

	smartAccount, err := s.aa.ComputeCounterfactualAddress(
		ctx,
		blockchain.SimpleAccountFactoryMainnet,
		blockchain.StringToAddress(owner),
		salt,
		req.Network,
	)
	if err != nil {
		return nil, fmt.Errorf("compute address: %w", err)
	}

	userOp := s.aa.CreateUserOperation(
		smartAccount.Hex(),
		big.NewInt(0),
		callData,
		"", // No paymaster for now
	)

	if req.Sponsored {
		// In production: set paymaster address from policy
		userOp.PaymasterAndData = "0x_sponsored_by_argos"
	}

	log.Info().
		Str("smart_account", smartAccount.Hex()).
		Str("network", req.Network).
		Bool("sponsored", req.Sponsored).
		Msg("sponsored transaction created")

	return userOp, nil
}

// EstimateGas estimates gas for a UserOperation
func (s *PaymasterService) EstimateGas(network string, callData string) (*big.Int, error) {
	// Base estimation: 200k for execution + 100k for verification
	base := new(big.Int).SetUint64(300000)
	return base, nil
}

// CheckBudget verifies if the tenant has remaining gas budget
func (s *PaymasterService) CheckBudget(ctx context.Context, tenantSchema string, estimatedGas *big.Int) (bool, error) {
	var used string
	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		row := tx.QueryRow(ctx, `
			SELECT COALESCE(SUM((payload->>'gas_used')::bigint), 0)::text
			FROM webhook_deliveries
			WHERE event = 'gas.sponsored'
			AND delivered_at > CURRENT_DATE
		`)
		return row.Scan(&used)
	})
	if err != nil {
		if strings.Contains(err.Error(), "does not exist") {
			return true, nil
		}
		return false, err
	}

	usedBig := new(big.Int)
	usedBig.SetString(used, 10)
	dailyBudget := new(big.Int).SetUint64(10_000_000_000) // 10 ETH/day default

	return new(big.Int).Add(usedBig, estimatedGas).Cmp(dailyBudget) < 0, nil
}

// RecordGasUsage records gas used for a sponsored transaction
func (s *PaymasterService) RecordGasUsage(ctx context.Context, tenantSchema string, txID uuid.UUID, gasUsed *big.Int) error {
	payload, _ := json.Marshal(map[string]interface{}{
		"tx_id":    txID,
		"gas_used": gasUsed.String(),
	})

	return s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		_, err := tx.Exec(ctx, `
			INSERT INTO webhook_deliveries (id, webhook_id, event, payload, delivered_at)
			VALUES ($1, '00000000-0000-0000-0000-000000000000', 'gas.sponsored', $2, $3)
		`, uuid.New(), payload, time.Now())
		return err
	})
}
