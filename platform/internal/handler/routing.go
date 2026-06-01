package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"github.com/google/uuid"

	"github.com/2mes4/argos-wallet/platform/internal/domain"
	"github.com/2mes4/argos-wallet/platform/internal/middleware"
	"github.com/2mes4/argos-wallet/platform/internal/service"
)

type RoutingHandler struct {
	routingSvc *service.RoutingService
}

func NewRoutingHandler(routingSvc *service.RoutingService) *RoutingHandler {
	return &RoutingHandler{routingSvc: routingSvc}
}

func (h *RoutingHandler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Post("/", h.CreateRule)
	r.Get("/", h.ListRules)
	r.Get("/{ruleID}", h.GetRule)
	r.Put("/{ruleID}", h.UpdateRule)
	r.Delete("/{ruleID}", h.DeleteRule)
	r.Post("/{ruleID}/execute", h.ExecuteRule)
	r.Get("/{ruleID}/executions", h.ListExecutions)

	return r
}

func (h *RoutingHandler) CreateRule(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())

	var req domain.CreateRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid request body"})
		return
	}

	rule, err := h.routingSvc.CreateRule(r.Context(), schema, req)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.Status(r, http.StatusCreated)
	render.JSON(w, r, rule)
}

func (h *RoutingHandler) GetRule(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())
	ruleID, err := uuid.Parse(chi.URLParam(r, "ruleID"))
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid rule id"})
		return
	}

	rule, err := h.routingSvc.GetRule(r.Context(), schema, ruleID)
	if err != nil {
		render.Status(r, http.StatusNotFound)
		render.JSON(w, r, map[string]string{"error": "rule not found"})
		return
	}

	render.JSON(w, r, rule)
}

func (h *RoutingHandler) ListRules(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())
	walletIDStr := r.URL.Query().Get("wallet_id")
	if walletIDStr == "" {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "wallet_id is required"})
		return
	}

	walletID, err := uuid.Parse(walletIDStr)
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid wallet_id"})
		return
	}

	rules, err := h.routingSvc.ListRules(r.Context(), schema, walletID)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.JSON(w, r, rules)
}

func (h *RoutingHandler) UpdateRule(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())
	ruleID, err := uuid.Parse(chi.URLParam(r, "ruleID"))
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid rule id"})
		return
	}

	var req domain.UpdateRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid request body"})
		return
	}

	rule, err := h.routingSvc.UpdateRule(r.Context(), schema, ruleID, req)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.JSON(w, r, rule)
}

func (h *RoutingHandler) DeleteRule(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())
	ruleID, err := uuid.Parse(chi.URLParam(r, "ruleID"))
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid rule id"})
		return
	}

	if err := h.routingSvc.DeleteRule(r.Context(), schema, ruleID); err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.JSON(w, r, map[string]string{"status": "deleted"})
}

func (h *RoutingHandler) ExecuteRule(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())
	ruleID, err := uuid.Parse(chi.URLParam(r, "ruleID"))
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid rule id"})
		return
	}

	exec, err := h.routingSvc.ExecuteRule(r.Context(), schema, ruleID, domain.TriggerManual)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.JSON(w, r, exec)
}

func (h *RoutingHandler) ListExecutions(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())
	ruleID, err := uuid.Parse(chi.URLParam(r, "ruleID"))
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid rule id"})
		return
	}

	execs, err := h.routingSvc.ListExecutions(r.Context(), schema, ruleID, 50)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.JSON(w, r, execs)
}
