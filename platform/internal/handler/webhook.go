package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/2mes4/argos-wallet/platform/internal/domain"
	"github.com/2mes4/argos-wallet/platform/internal/middleware"
	"github.com/2mes4/argos-wallet/platform/internal/service"
)

type WebhookHandler struct {
	svc *service.WebhookService
}

func NewWebhookHandler(svc *service.WebhookService) *WebhookHandler {
	return &WebhookHandler{svc: svc}
}

func (h *WebhookHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Post("/", h.Create)
	r.Get("/", h.List)
	r.Delete("/{id}", h.Delete)
	r.Get("/{id}/deliveries", h.ListDeliveries)
	return r
}

func (h *WebhookHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateWebhookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	if req.URL == "" || len(req.Events) == 0 {
		http.Error(w, `{"error":"url and events required"}`, http.StatusBadRequest)
		return
	}

	schema := middleware.GetSchema(r.Context())

	wh, err := h.svc.Create(r.Context(), schema, req)
	if err != nil {
		log.Error().Err(err).Msg("webhook create")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(wh)
}

func (h *WebhookHandler) List(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())

	webhooks, err := h.svc.List(r.Context(), schema)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if webhooks == nil {
		webhooks = []domain.Webhook{}
	}
	json.NewEncoder(w).Encode(webhooks)
}

func (h *WebhookHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, `{"error":"invalid id"}`, http.StatusBadRequest)
		return
	}

	schema := middleware.GetSchema(r.Context())

	if err := h.svc.Delete(r.Context(), schema, id); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

func (h *WebhookHandler) ListDeliveries(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, `{"error":"invalid id"}`, http.StatusBadRequest)
		return
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}

	schema := middleware.GetSchema(r.Context())
	_ = schema
	_ = id
	_ = limit

	json.NewEncoder(w).Encode([]interface{}{})
}
