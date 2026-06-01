package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/go-chi/render"
	"github.com/google/uuid"

	"github.com/2mes4/argos-wallet/platform/internal/service"
)

type contextKey string

const (
	TenantCtxKey   contextKey = "tenant"
	TenantIDCtxKey contextKey = "tenant_id"
	SchemaCtxKey   contextKey = "schema"
)

type TenantInfo struct {
	ID        uuid.UUID
	Name      string
	Slug      string
	Schema    string
	Plan      string
}

func APIKeyAuth(tenantSvc *service.TenantService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			apiKey := extractAPIKey(r)
			if apiKey == "" {
				render.Status(r, http.StatusUnauthorized)
				render.JSON(w, r, map[string]string{"error": "missing API key"})
				return
			}

			tenant, err := tenantSvc.ResolveByAPIKey(r.Context(), apiKey)
			if err != nil {
				render.Status(r, http.StatusUnauthorized)
				render.JSON(w, r, map[string]string{"error": "invalid API key"})
				return
			}

			info := &TenantInfo{
				ID:     tenant.ID,
				Name:   tenant.Name,
				Slug:   tenant.Slug,
				Schema: tenant.SchemaName,
				Plan:   tenant.Plan,
			}

			ctx := context.WithValue(r.Context(), TenantCtxKey, info)
			ctx = context.WithValue(ctx, TenantIDCtxKey, tenant.ID)
			ctx = context.WithValue(ctx, SchemaCtxKey, tenant.SchemaName)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetTenant(ctx context.Context) *TenantInfo {
	val := ctx.Value(TenantCtxKey)
	if val == nil {
		return nil
	}
	return val.(*TenantInfo)
}

func GetSchema(ctx context.Context) string {
	val := ctx.Value(SchemaCtxKey)
	if val == nil {
		return ""
	}
	return val.(string)
}

func extractAPIKey(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}

	if auth != "" {
		return auth
	}

	return r.Header.Get("X-API-Key")
}
