package domain

import (
	"time"

	"github.com/google/uuid"
)

type Tenant struct {
	ID               uuid.UUID       `json:"id"`
	Name             string          `json:"name"`
	Slug             string          `json:"slug"`
	APIKeyHash       string          `json:"-"`
	FirebaseProjectID string         `json:"firebase_project_id,omitempty"`
	Plan             string          `json:"plan"`
	SchemaName       string          `json:"schema_name"`
	Settings         TenantSettings  `json:"settings"`
	CreatedAt        time.Time       `json:"created_at"`
}

type TenantSettings struct {
	AllowedNetworks  []string `json:"allowed_networks"`
	MaxWallets       int      `json:"max_wallets"`
	RateLimitPerMin  int      `json:"rate_limit_per_min"`
	WebhookURL       string   `json:"webhook_url,omitempty"`
	FiatProvider     string   `json:"fiat_provider,omitempty"`
}

type CreateTenantRequest struct {
	Name              string  `json:"name" validate:"required"`
	Plan              string  `json:"plan,omitempty"`
	FirebaseProjectID string  `json:"firebase_project_id,omitempty"`
}

type TenantAPIKey struct {
	ID          uuid.UUID `json:"id"`
	TenantID    uuid.UUID `json:"tenant_id"`
	KeyHash     string    `json:"-"`
	Name        string    `json:"name"`
	Permissions []string  `json:"permissions"`
	LastUsedAt  *time.Time `json:"last_used_at,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type APIKeyResponse struct {
	ID     uuid.UUID `json:"id"`
	Name   string    `json:"name"`
	APIKey string    `json:"api_key"`
}
