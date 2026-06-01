package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/2mes4/argos-wallet/platform/internal/blockchain"
	"github.com/2mes4/argos-wallet/platform/internal/config"
	"github.com/2mes4/argos-wallet/platform/internal/database"
	"github.com/2mes4/argos-wallet/platform/internal/domain"
	firestore "github.com/2mes4/argos-wallet/platform/internal/firebase"
	"github.com/2mes4/argos-wallet/platform/internal/handler"
	mw "github.com/2mes4/argos-wallet/platform/internal/middleware"
	"github.com/2mes4/argos-wallet/platform/internal/repository"
	"github.com/2mes4/argos-wallet/platform/internal/service"
	"github.com/2mes4/argos-wallet/platform/internal/vault"
)

func main() {
	zerolog.TimeFieldFormat = time.RFC3339

	cfg := config.Load()

	ctx := context.Background()

	db, err := database.New(ctx, &cfg.Database)
	if err != nil {
		log.Fatal().Err(err).Msg("database connection failed")
	}
	defer db.Close()

	if os.Getenv("RUN_MIGRATIONS") == "true" {
		if err := db.RunMigrations(); err != nil {
			log.Fatal().Err(err).Msg("migrations failed")
		}
		log.Info().Msg("migrations completed")
	}

	events := make(chan domain.TransactionEvent, 100)

	// Initialize key source: Vault or env
	mnemonic := "dev-mnemonic-do-not-use-in-production"
	if cfg.Vault.Token != "" && cfg.Vault.Address != "" {
		vaultClient := vault.NewClient(cfg.Vault.Address, cfg.Vault.Token)
		if m, err := vaultClient.GetMnemonic(ctx, cfg.Blockchain.MnemonicSeedID); err == nil {
			mnemonic = m
			log.Info().Msg("mnemonic loaded from vault")
		} else {
			log.Warn().Err(err).Msg("vault mnemonic load failed, using default")
		}
	}

	// Blockchain clients
	evm := blockchain.NewEVMClient(cfg.Blockchain.RPCURLs, mnemonic)
	solana := blockchain.NewSolanaClient(cfg.Blockchain.RPCURLs["solana"])
	aa := blockchain.NewAccountAbstractionClient(
		os.Getenv("BUNDLER_URL"),
		cfg.Blockchain.RPCURLs["ethereum"],
	)

	// Firebase Firestore
	fsClient := firestore.NewClient(cfg.Firebase.ProjectID)
	if fsClient.Enabled() {
		log.Info().Str("project", cfg.Firebase.ProjectID).Msg("firestore sync enabled")
	}

	// Repositories
	tenantRepo := repository.NewTenantRepo()
	walletRepo := repository.NewWalletRepo()
	txRepo := repository.NewTransactionRepo()
	routingRepo := repository.NewRoutingRepo()

	// Services
	tenantSvc := service.NewTenantService(db, tenantRepo)
	walletSvc := service.NewWalletService(db, walletRepo, evm, cfg.Blockchain.DefaultNetworks)
	txSvc := service.NewTransactionService(db, txRepo, evm, events)
	routingSvc := service.NewRoutingService(db, routingRepo, txSvc)
	identitySvc := service.NewIdentityService(db, evm)
	webhookSvc := service.NewWebhookService(db)
	paymasterSvc := service.NewPaymasterService(db, aa)
	multisigSvc := service.NewMultisigService(db)
	hardwareSvc := service.NewHardwareWalletService(db)

	_ = solana
	_ = paymasterSvc
	_ = multisigSvc
	_ = hardwareSvc

	// Event processor: handles transaction events → webhooks + firestore
	go processEvents(events, webhookSvc, fsClient)

	rateLimiter := mw.NewRateLimiter(100, time.Minute)

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(30 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.Server.AllowOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-API-Key"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","version":"0.2.0","service":"argos-wallet"}`))
	})

	r.Get("/v1/ready", func(w http.ResponseWriter, r *http.Request) {
		if err := db.Pool.Ping(r.Context()); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"status":"not ready","error":"database"}`))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ready"}`))
	})

	tenantHandler := handler.NewTenantHandler(tenantSvc)
	r.Mount("/v1/tenants", tenantHandler.Routes())

	r.Group(func(r chi.Router) {
		r.Use(mw.APIKeyAuth(tenantSvc))
		r.Use(rateLimiter.Middleware)

		walletHandler := handler.NewWalletHandler(walletSvc)
		r.Mount("/v1/wallets", walletHandler.Routes())

		txHandler := handler.NewTransactionHandler(txSvc)
		r.Mount("/v1/transactions", txHandler.Routes())

		routingHandler := handler.NewRoutingHandler(routingSvc)
		r.Mount("/v1/routing/rules", routingHandler.Routes())

		identityHandler := handler.NewIdentityHandler(identitySvc)
		r.Mount("/v1/identity", identityHandler.Routes())

		webhookHandler := handler.NewWebhookHandler(webhookSvc)
		r.Mount("/v1/webhooks", webhookHandler.Routes())
	})

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  time.Duration(cfg.Server.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(cfg.Server.WriteTimeout) * time.Second,
	}

	go func() {
		log.Info().Str("addr", addr).Msg("argos server starting")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("server failed")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatal().Err(err).Msg("shutdown failed")
	}

	close(events)
	log.Info().Msg("argos server stopped")
}

func processEvents(
	events <-chan domain.TransactionEvent,
	webhookSvc *service.WebhookService,
	fsClient *firestore.Client,
) {
	for evt := range events {
		eventType := mapEventType(evt)
		payload := map[string]interface{}{
			"id":          evt.TransactionID,
			"wallet_id":   evt.WalletID,
			"type":        evt.Type,
			"old_status":  evt.OldStatus,
			"new_status":  evt.NewStatus,
			"timestamp":   evt.Timestamp,
		}

		webhookSvc.Dispatch(context.Background(), "public", eventType, payload)

		if fsClient.Enabled() {
			fsClient.SyncTransaction(context.Background(), "", "", payload)
		}
	}
}

func mapEventType(evt domain.TransactionEvent) string {
	switch evt.NewStatus {
	case domain.TxStatusCompleted:
		return domain.WebhookEventTransactionConfirmed
	case domain.TxStatusFailed:
		return domain.WebhookEventTransactionFailed
	case domain.TxStatusInitiated:
		return domain.WebhookEventTransactionCreated
	default:
		return "transaction.updated"
	}
}
