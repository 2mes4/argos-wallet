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

type WalletHandler struct {
	walletSvc *service.WalletService
}

func NewWalletHandler(walletSvc *service.WalletService) *WalletHandler {
	return &WalletHandler{walletSvc: walletSvc}
}

func (h *WalletHandler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Post("/", h.Create)
	r.Get("/{walletID}", h.Get)
	r.Get("/{walletID}/addresses", h.GetAddresses)
	r.Get("/{walletID}/balances", h.GetBalances)
	r.Delete("/{walletID}", h.Deactivate)

	r.Post("/{walletID}/connections", h.LinkExternal)
	r.Get("/{walletID}/connections", h.ListConnections)
	r.Delete("/{walletID}/connections/{connectionID}", h.UnlinkExternal)

	return r
}

func (h *WalletHandler) Create(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())

	var req domain.CreateWalletRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid request body"})
		return
	}

	wallet, err := h.walletSvc.Create(r.Context(), schema, req)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.Status(r, http.StatusCreated)
	render.JSON(w, r, wallet)
}

func (h *WalletHandler) Get(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())
	walletID, err := uuid.Parse(chi.URLParam(r, "walletID"))
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid wallet id"})
		return
	}

	wallet, err := h.walletSvc.Get(r.Context(), schema, walletID)
	if err != nil {
		render.Status(r, http.StatusNotFound)
		render.JSON(w, r, map[string]string{"error": "wallet not found"})
		return
	}

	render.JSON(w, r, wallet)
}

func (h *WalletHandler) GetAddresses(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())
	walletID, err := uuid.Parse(chi.URLParam(r, "walletID"))
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid wallet id"})
		return
	}

	addresses, err := h.walletSvc.GetAddresses(r.Context(), schema, walletID)
	if err != nil {
		render.Status(r, http.StatusNotFound)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.JSON(w, r, addresses)
}

func (h *WalletHandler) GetBalances(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())
	walletID, err := uuid.Parse(chi.URLParam(r, "walletID"))
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid wallet id"})
		return
	}

	balances, err := h.walletSvc.GetBalances(r.Context(), schema, walletID)
	if err != nil {
		render.Status(r, http.StatusNotFound)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.JSON(w, r, balances)
}

func (h *WalletHandler) Deactivate(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())
	walletID, err := uuid.Parse(chi.URLParam(r, "walletID"))
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid wallet id"})
		return
	}

	if err := h.walletSvc.Deactivate(r.Context(), schema, walletID); err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.JSON(w, r, map[string]string{"status": "deactivated"})
}

func (h *WalletHandler) LinkExternal(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())
	walletID, err := uuid.Parse(chi.URLParam(r, "walletID"))
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid wallet id"})
		return
	}

	var req domain.LinkExternalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid request body"})
		return
	}

	conn, err := h.walletSvc.LinkExternal(r.Context(), schema, walletID, req)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.Status(r, http.StatusCreated)
	render.JSON(w, r, conn)
}

func (h *WalletHandler) ListConnections(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())
	walletID, err := uuid.Parse(chi.URLParam(r, "walletID"))
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid wallet id"})
		return
	}

	conns, err := h.walletSvc.ListExternalConnections(r.Context(), schema, walletID)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.JSON(w, r, conns)
}

func (h *WalletHandler) UnlinkExternal(w http.ResponseWriter, r *http.Request) {
	schema := middleware.GetSchema(r.Context())
	connID, err := uuid.Parse(chi.URLParam(r, "connectionID"))
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "invalid connection id"})
		return
	}

	if err := h.walletSvc.UnlinkExternal(r.Context(), schema, connID); err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": err.Error()})
		return
	}

	render.JSON(w, r, map[string]string{"status": "unlinked"})
}
