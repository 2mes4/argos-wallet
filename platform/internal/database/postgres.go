package database

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/2mes4/argos-wallet/platform/internal/config"
)

type DB struct {
	Pool *pgxpool.Pool
	cfg  *config.DatabaseConfig
}

func New(ctx context.Context, cfg *config.DatabaseConfig) (*DB, error) {
	poolCfg, err := pgxpool.ParseConfig(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("parse db config: %w", err)
	}

	poolCfg.MaxConns = int32(cfg.MaxOpenConns)
	poolCfg.MinConns = int32(cfg.MaxIdleConns)
	poolCfg.MaxConnLifetime = time.Duration(cfg.ConnMaxLifetime) * time.Second
	poolCfg.HealthCheckPeriod = 30 * time.Second

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}

	return &DB{Pool: pool, cfg: cfg}, nil
}

func (db *DB) Close() {
	db.Pool.Close()
}

// WithTenant executes fn inside a transaction with SET LOCAL search_path to the tenant schema.
// The fn receives a pgx.Tx that has the correct search_path set.
func (db *DB) WithTenant(ctx context.Context, tenantSchema string, fn func(ctx context.Context, tx pgx.Tx) error) error {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, fmt.Sprintf("SET LOCAL search_path = %s, public", tenantSchema)); err != nil {
		return fmt.Errorf("set search_path: %w", err)
	}

	if err := fn(ctx, tx); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

func (db *DB) RunMigrations() error {
	ctx := context.Background()

	_, err := db.Pool.Exec(ctx, `
	CREATE TABLE IF NOT EXISTS tenants (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		name VARCHAR(255) NOT NULL,
		slug VARCHAR(100) UNIQUE NOT NULL,
		api_key_hash VARCHAR(255) NOT NULL,
		firebase_project_id VARCHAR(255),
		plan VARCHAR(50) DEFAULT 'starter',
		schema_name VARCHAR(100) NOT NULL,
		settings JSONB DEFAULT '{}',
		created_at TIMESTAMPTZ DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS tenant_api_keys (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
		key_hash VARCHAR(255) NOT NULL,
		name VARCHAR(100),
		permissions JSONB DEFAULT '["read","write"]',
		last_used_at TIMESTAMPTZ,
		created_at TIMESTAMPTZ DEFAULT NOW()
	);

	CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_hash ON tenant_api_keys(key_hash);
	CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant ON tenant_api_keys(tenant_id);
	`)
	if err != nil {
		return fmt.Errorf("create platform schema: %w", err)
	}

	return nil
}

func (db *DB) CreateTenantSchema(ctx context.Context, schemaName string) error {
	s := schemaName

	_, err := db.Pool.Exec(ctx, fmt.Sprintf(`CREATE SCHEMA IF NOT EXISTS %s;`, s))
	if err != nil {
		return fmt.Errorf("create schema: %w", err)
	}

	stmts := []string{
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s.wallets (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			external_id VARCHAR(255),
			status VARCHAR(20) DEFAULT 'active',
			metadata JSONB DEFAULT '{}',
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		);`, s),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s.wallet_addresses (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			wallet_id UUID REFERENCES %s.wallets(id) ON DELETE CASCADE,
			network VARCHAR(50) NOT NULL,
			address VARCHAR(255) NOT NULL,
			derivation_path VARCHAR(100),
			is_default BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			UNIQUE(network, address)
		);`, s, s),

		fmt.Sprintf(`CREATE INDEX IF NOT EXISTS idx_%s_wa_wallet ON %s.wallet_addresses(wallet_id);`, s, s),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s.external_connections (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			wallet_id UUID REFERENCES %s.wallets(id) ON DELETE CASCADE,
			provider VARCHAR(50) NOT NULL,
			address VARCHAR(255) NOT NULL,
			chain_id INTEGER,
			metadata JSONB DEFAULT '{}',
			connected_at TIMESTAMPTZ DEFAULT NOW(),
			disconnected_at TIMESTAMPTZ
		);`, s, s),

		fmt.Sprintf(`CREATE INDEX IF NOT EXISTS idx_%s_ec_wallet ON %s.external_connections(wallet_id);`, s, s),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s.transactions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			wallet_id UUID REFERENCES %s.wallets(id),
			type VARCHAR(30) NOT NULL,
			status VARCHAR(20) DEFAULT 'initiated',
			source_network VARCHAR(50),
			source_token VARCHAR(20),
			source_amount VARCHAR(78),
			target_network VARCHAR(50),
			target_token VARCHAR(20),
			target_amount VARCHAR(78),
			to_address VARCHAR(255),
			tx_hash VARCHAR(255),
			fiat_transfer_id VARCHAR(255),
			contract_address VARCHAR(255),
			contract_method VARCHAR(100),
			contract_args JSONB,
			rule_id UUID,
			error TEXT,
			metadata JSONB DEFAULT '{}',
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		);`, s, s),

		fmt.Sprintf(`CREATE INDEX IF NOT EXISTS idx_%s_tx_ws ON %s.transactions(wallet_id, status);`, s, s),
		fmt.Sprintf(`CREATE INDEX IF NOT EXISTS idx_%s_tx_c ON %s.transactions(created_at DESC);`, s, s),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s.routing_rules (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			wallet_id UUID REFERENCES %s.wallets(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			type VARCHAR(30) NOT NULL,
			priority INTEGER DEFAULT 0,
			enabled BOOLEAN DEFAULT TRUE,
			conditions JSONB NOT NULL,
			actions JSONB NOT NULL,
			last_evaluated TIMESTAMPTZ,
			last_executed TIMESTAMPTZ,
			execution_count INTEGER DEFAULT 0,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		);`, s, s),

		fmt.Sprintf(`CREATE INDEX IF NOT EXISTS idx_%s_rr_wallet ON %s.routing_rules(wallet_id, enabled);`, s, s),

		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s.rule_executions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			rule_id UUID REFERENCES %s.routing_rules(id),
			transaction_id UUID REFERENCES %s.transactions(id),
			status VARCHAR(20),
			trigger_reason VARCHAR(50),
			result JSONB,
			executed_at TIMESTAMPTZ DEFAULT NOW()
		);`, s, s, s),

		fmt.Sprintf(`CREATE INDEX IF NOT EXISTS idx_%s_re_rule ON %s.rule_executions(rule_id, executed_at DESC);`, s, s),
	}

	fullSQL := strings.Join(stmts, "\n")
	_, err = db.Pool.Exec(ctx, fullSQL)
	if err != nil {
		return fmt.Errorf("create tenant tables: %w", err)
	}

	return nil
}

func (db *DB) SetSchema(ctx context.Context, schemaName string) error {
	_, err := db.Pool.Exec(ctx, fmt.Sprintf("SET search_path = %s, public", schemaName))
	return err
}
