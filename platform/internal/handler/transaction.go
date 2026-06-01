package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
	"github.com/google/uuid"

	"github.com/2mes4/argos-wallet/platform/internal/domain"
	"github.com/2mes4/argos-wallet/platform/internal/middleware"
	"github.com/2mes4/argos-wallet/platform/internal/service"
)

type TransactionHandler struct {
	txSvc *service.TransactionService
}

func NewTransactionHandler(txSvc *service.TransactionService) *TransactionHandler {
	return &TransactionHandler{txSvc: txSvc}
}

func (h *TransactionHandler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Post("/transfer", h.Transfer)
	r.Post("/fiat-to-crypto", h.FiatToCrypto)
	r.Post("/crypto-to-fiat", h.CryptoToFiat)
	r.Post("/contract-call", h.ContractCall)
	r.Get("/{txID}", h.Get)
	r.Get("/", h.List)
	r.Post("/{txID}/cancel", h.Cancel)

	return r
}

func (h *TransactionHandler) Transfer(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())

	var req domain.CreateTransferRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid request body"})
		return
	}

	tx, err := h.txSvc.Transfer(r.Context(), schema, req)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.Status(r, http.StatusCreated)
	render.JSON(w, r, tx)
}

func (h *TransactionHandler) FiatToCrypto(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())

	var req domain.CreateFiatToCryptoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid request body"})
		return
	}

	tx, err := h.txSvc.FiatToCrypto(r.Context(), schema, req)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.Status(r, http.StatusCreated)
	render.JSON(w, r, tx)
}

func (h *TransactionHandler) CryptoToFiat(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())

	var req domain.CreateCryptoToFiatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid request body"})
		return
	}

	tx, err := h.txSvc.CryptoToFiat(r.Context(), schema, req)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.Status(r, http.StatusCreated)
	render.JSON(w, r, tx)
}

func (h *TransactionHandler) ContractCall(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())

	var req domain.CreateContractCallRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid request body"})
		return
	}

	tx, err := h.txSvc.ContractCall(r.Context(), schema, req)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.Status(r, http.StatusCreated)
	render.JSON(w, r, tx)
}

func (h *TransactionHandler) Get(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())
	txID, err := uuid.Parse(chi.URLParam(r, "txID"))
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid transaction id"})
		return
	}

	tx, err := h.txSvc.Get(r.Context(), schema, txID)
	if err != nil {
		render.Status(r, http.StatusNotFound)
		render.JSON(w, r, map[string]string{"error": "transaction not found"})
		return
	}

	render.JSON(w, r, tx)
}

func (h *TransactionHandler) List(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())

	filters := domain.TransactionFilters{}
	if walletID := r.URL.Query().Get("wallet_id"); walletID != "" {
		id, _ := uuid.Parse(walletID)
		filters.WalletID = &id
	}
	if txType := r.URL.Query().Get("type"); txType != "" {
		t := domain.TransactionType(txType)
		filters.Type = &t
	}
	if status := r.URL.Query().Get("status"); status != "" {
		s := domain.TransactionStatus(status)
		filters.Status = &s
	}
	if limit := r.URL.Query().Get("limit"); limit != "" {
		filters.Limit, _ = strconv.Atoi(limit)
	} else {
		filters.Limit = 50
	}
	if offset := r.URL.Query().Get("offset"); offset != "" {
		filters.Offset, _ = strconv.Atoi(offset)
	}

	txs, err := h.txSvc.List(r.Context(), schema, filters)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.JSON(w, r, txs)
}

func (h *TransactionHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())
	txID, err := uuid.Parse(chi.URLParam(r, "txID"))
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid transaction id"})
		return
	}

	tx, err := h.txSvc.Cancel(r.Context(), schema, txID)
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.JSON(w, r, tx)
}
