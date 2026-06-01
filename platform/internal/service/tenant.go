package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"golang.org/x/crypto/bcrypt"

	"github.com/2mes4/argos-wallet/platform/internal/database"
	"github.com/2mes4/argos-wallet/platform/internal/domain"
	"github.com/2mes4/argos-wallet/platform/internal/repository"
)

type TenantService struct {
	db       *database.DB
	tenantDB *repository.TenantRepo
}

func NewTenantService(db *database.DB, tenantDB *repository.TenantRepo) *TenantService {
	return &TenantService{db: db, tenantDB: tenantDB}
}

func (s *TenantService) Register(ctx context.Context, req domain.CreateTenantRequest) (*domain.Tenant, *domain.APIKeyResponse, error) {
	slug := generateSlug(req.Name)
	schemaName := "tenant_" + slug

	tenant := &domain.Tenant{
		ID:    uuid.New(),
		Name:  req.Name,
		Slug:  slug,
		Plan:  defaultStr(req.Plan, "starter"),
		SchemaName: schemaName,
		Settings: domain.TenantSettings{
			AllowedNetworks: []string{"polygon", "ethereum", "base"},
			MaxWallets:      100,
			RateLimitPerMin: 100,
		},
		CreatedAt: time.Now(),
	}

	apiKey := generateAPIKey()
	lookupHash := sha256Hash(apiKey)
	bcryptHash, _ := bcrypt.GenerateFromPassword([]byte(apiKey), bcrypt.DefaultCost)
	_ = bcryptHash
	tenant.APIKeyHash = lookupHash

	tx, err := s.db.Pool.Begin(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := s.tenantDB.Create(ctx, tx, tenant); err != nil {
		return nil, nil, fmt.Errorf("create tenant: %w", err)
	}

	apiKeyRecord := &domain.TenantAPIKey{
		ID:          uuid.New(),
		TenantID:    tenant.ID,
		KeyHash:     lookupHash,
		Name:        "Default",
		Permissions: []string{"read", "write"},
		CreatedAt:   time.Now(),
	}
	if err := s.tenantDB.CreateAPIKey(ctx, tx, apiKeyRecord); err != nil {
		return nil, nil, fmt.Errorf("create api key: %w", err)
	}

	if err := s.db.CreateTenantSchema(ctx, schemaName); err != nil {
		return nil, nil, fmt.Errorf("create schema: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, fmt.Errorf("commit: %w", err)
	}

	log.Info().Str("tenant", slug).Str("id", tenant.ID.String()).Msg("tenant registered")

	return tenant, &domain.APIKeyResponse{
		ID:     apiKeyRecord.ID,
		Name:   apiKeyRecord.Name,
		APIKey: apiKey,
	}, nil
}

func (s *TenantService) ResolveByAPIKey(ctx context.Context, apiKey string) (*domain.Tenant, error) {
	lookupHash := sha256Hash(apiKey)
	return s.tenantDB.GetByAPIKey(ctx, s.db.Pool, lookupHash)
}

func (s *TenantService) CreateAPIKey(ctx context.Context, tenantID uuid.UUID, name string) (*domain.APIKeyResponse, error) {
	apiKey := generateAPIKey()
	lookupHash := sha256Hash(apiKey)

	key := &domain.TenantAPIKey{
		ID:          uuid.New(),
		TenantID:    tenantID,
		KeyHash:     lookupHash,
		Name:        name,
		Permissions: []string{"read", "write"},
		CreatedAt:   time.Now(),
	}

	tx, err := s.db.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if err := s.tenantDB.CreateAPIKey(ctx, tx, key); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &domain.APIKeyResponse{
		ID:     key.ID,
		Name:   key.Name,
		APIKey: apiKey,
	}, nil
}

func sha256Hash(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

func generateAPIKey() string {
	id := uuid.New().String()[:16]
	return "argos_" + id + "_" + uuid.New().String()[:16]
}

func apiKeyPrefix(key string) string {
	parts := strings.SplitN(key, "_", 3)
	if len(parts) >= 2 {
		return parts[1]
	}
	return ""
}

func generateSlug(name string) string {
	slug := name
	for _, c := range []string{" ", ".", ",", "'", "\"", "/", "\\", ":", ";", "!", "?", "@", "#", "$", "%", "^", "&", "*", "(", ")", "+", "=", "{", "}", "[", "]", "|", "\\", "<", ">"} {
		slug = replaceAll(slug, c, "")
	}
	if len(slug) > 50 {
		slug = slug[:50]
	}
	return slug + "_" + uuid.New().String()[:8]
}

func defaultStr(val, fallback string) string {
	if val == "" {
		return fallback
	}
	return val
}

func replaceAll(s, old, new string) string {
	result := s
	for {
		if len(result) == 0 || !contains(result, old) {
			break
		}
		result = replace(result, old, new)
	}
	return result
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

func replace(s, old, new string) string {
	for i := 0; i+len(old) <= len(s); i++ {
		if s[i:i+len(old)] == old {
			return s[:i] + new + s[i+len(old):]
		}
	}
	return s
}
