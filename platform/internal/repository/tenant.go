package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/2mes4/argos-wallet/platform/internal/domain"
)

type TenantRepo struct{}

func NewTenantRepo() *TenantRepo {
	return &TenantRepo{}
}

func (r *TenantRepo) Create(ctx context.Context, tx pgx.Tx, tenant *domain.Tenant) error {
	settings, _ := json.Marshal(tenant.Settings)
	_, err := tx.Exec(ctx, `
		INSERT INTO tenants (id, name, slug, api_key_hash, firebase_project_id, plan, schema_name, settings)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, tenant.ID, tenant.Name, tenant.Slug, tenant.APIKeyHash,
		tenant.FirebaseProjectID, tenant.Plan, tenant.SchemaName, settings)
	return err
}

func (r *TenantRepo) GetBySlug(ctx context.Context, db DBTX, slug string) (*domain.Tenant, error) {
	t := &domain.Tenant{}
	var settings []byte
	err := db.QueryRow(ctx, `
		SELECT id, name, slug, api_key_hash, firebase_project_id, plan, schema_name, settings, created_at
		FROM tenants WHERE slug = $1
	`, slug).Scan(&t.ID, &t.Name, &t.Slug, &t.APIKeyHash, &t.FirebaseProjectID,
		&t.Plan, &t.SchemaName, &settings, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	json.Unmarshal(settings, &t.Settings)
	return t, nil
}

func (r *TenantRepo) GetByAPIKey(ctx context.Context, db DBTX, apiKeyHash string) (*domain.Tenant, error) {
	t := &domain.Tenant{}
	var settings []byte
	err := db.QueryRow(ctx, `
		SELECT t.id, t.name, t.slug, t.api_key_hash, t.firebase_project_id, t.plan, t.schema_name, t.settings, t.created_at
		FROM tenants t
		JOIN tenant_api_keys k ON k.tenant_id = t.id
		WHERE k.key_hash = $1
	`, apiKeyHash).Scan(&t.ID, &t.Name, &t.Slug, &t.APIKeyHash, &t.FirebaseProjectID,
		&t.Plan, &t.SchemaName, &settings, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	json.Unmarshal(settings, &t.Settings)

	now := time.Now()
	db.Exec(ctx, `UPDATE tenant_api_keys SET last_used_at = $1 WHERE key_hash = $2`, now, apiKeyHash)

	return t, nil
}

func (r *TenantRepo) CreateAPIKey(ctx context.Context, tx pgx.Tx, key *domain.TenantAPIKey) error {
	perms, _ := json.Marshal(key.Permissions)
	_, err := tx.Exec(ctx, `
		INSERT INTO tenant_api_keys (id, tenant_id, key_hash, name, permissions, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, key.ID, key.TenantID, key.KeyHash, key.Name, perms, key.CreatedAt)
	return err
}

func (r *TenantRepo) ListAPIKeys(ctx context.Context, db DBTX, tenantID uuid.UUID) ([]domain.TenantAPIKey, error) {
	rows, err := db.Query(ctx, `
		SELECT id, tenant_id, name, permissions, last_used_at, created_at
		FROM tenant_api_keys WHERE tenant_id = $1 ORDER BY created_at DESC
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	keys := []domain.TenantAPIKey{}
	for rows.Next() {
		var k domain.TenantAPIKey
		var perms []byte
		err := rows.Scan(&k.ID, &k.TenantID, &k.Name, &perms, &k.LastUsedAt, &k.CreatedAt)
		if err != nil {
			return nil, err
		}
		json.Unmarshal(perms, &k.Permissions)
		keys = append(keys, k)
	}
	return keys, nil
}

func (r *TenantRepo) DeleteAPIKey(ctx context.Context, db DBTX, id uuid.UUID) error {
	_, err := db.Exec(ctx, `DELETE FROM tenant_api_keys WHERE id = $1`, id)
	return err
}

type DBTX interface {
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
	Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error)
	Exec(ctx context.Context, sql string, args ...interface{}) (pgconn.CommandTag, error)
}

func CheckTenantAccess(ctx context.Context, db DBTX, tenantID, walletID uuid.UUID) error {
	var id uuid.UUID
	err := db.QueryRow(ctx, `SELECT id FROM wallets WHERE id = $1`, walletID).Scan(&id)
	if err != nil {
		return fmt.Errorf("wallet not found: %w", err)
	}
	return nil
}
