package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"

	"github.com/2mes4/argos-wallet/platform/internal/domain"
	"github.com/2mes4/argos-wallet/platform/internal/middleware"
	"github.com/2mes4/argos-wallet/platform/internal/service"
)

type IdentityHandler struct {
	identitySvc *service.IdentityService
}

func NewIdentityHandler(identitySvc *service.IdentityService) *IdentityHandler {
	return &IdentityHandler{identitySvc: identitySvc}
}

func (h *IdentityHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Post("/sign-message", h.SignMessage)
	r.Post("/verify-signature", h.VerifySignature)
	r.Post("/sign-transaction", h.SignTransaction)
	return r
}

func (h *IdentityHandler) SignMessage(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())

	var req domain.SignMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid request body"})
		return
	}

	resp, err := h.identitySvc.SignMessage(r.Context(), schema, req)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.JSON(w, r, resp)
}

func (h *IdentityHandler) VerifySignature(w http.ResponseWriter, r *http.Request) {
	var req domain.VerifySignatureRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid request body"})
		return
	}

	resp, err := h.identitySvc.VerifySignature(r.Context(), req)
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.JSON(w, r, resp)
}

func (h *IdentityHandler) SignTransaction(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())

	var req domain.SignTransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid request body"})
		return
	}

	resp, err := h.identitySvc.SignTransaction(r.Context(), schema, req)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.JSON(w, r, resp)
}
