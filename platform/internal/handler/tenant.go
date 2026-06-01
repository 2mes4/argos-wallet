package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"

	"github.com/2mes4/argos-wallet/platform/internal/domain"
	"github.com/2mes4/argos-wallet/platform/internal/service"
)

type TenantHandler struct {
	tenantSvc *service.TenantService
}

func NewTenantHandler(tenantSvc *service.TenantService) *TenantHandler {
	return &TenantHandler{tenantSvc: tenantSvc}
}

func (h *TenantHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Post("/register", h.Register)
	r.Post("/api-keys", h.CreateAPIKey)
	return r
}

func (h *TenantHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateTenantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid request body"})
		return
	}

	tenant, apiKey, err := h.tenantSvc.Register(r.Context(), req)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.Status(r, http.StatusCreated)
	render.JSON(w, r, map[string]interface{}{
		"tenant": map[string]interface{}{
			"id":    tenant.ID,
			"name":  tenant.Name,
			"slug":  tenant.Slug,
			"plan":  tenant.Plan,
			"schema": tenant.SchemaName,
		},
		"api_key": apiKey,
	})
}

func (h *TenantHandler) CreateAPIKey(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TenantID string `json:"tenant_id"`
		Name     string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid request body"})
		return
	}

	tenantID, err := parseUUID(req.TenantID)
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid tenant_id"})
		return
	}

	apiKey, err := h.tenantSvc.CreateAPIKey(r.Context(), tenantID, req.Name)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.Status(r, http.StatusCreated)
	render.JSON(w, r, apiKey)
}
