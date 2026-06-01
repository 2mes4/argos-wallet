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
	"github.com/2mes4/argos-wallet/platform/internal/handler"
	mw "github.com/2mes4/argos-wallet/platform/internal/middleware"
	"github.com/2mes4/argos-wallet/platform/internal/repository"
	"github.com/2mes4/argos-wallet/platform/internal/service"
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
	_ = events

	evm := blockchain.NewEVMClient(cfg.Blockchain.RPCURLs, "dev-mnemonic-do-not-use-in-production")

	tenantRepo := repository.NewTenantRepo()
	walletRepo := repository.NewWalletRepo()
	txRepo := repository.NewTransactionRepo()
	routingRepo := repository.NewRoutingRepo()

	tenantSvc := service.NewTenantService(db, tenantRepo)
	walletSvc := service.NewWalletService(db, walletRepo, evm, cfg.Blockchain.DefaultNetworks)
	txSvc := service.NewTransactionService(db, txRepo, evm, events)
	routingSvc := service.NewRoutingService(db, routingRepo, txSvc)
	identitySvc := service.NewIdentityService(db, evm)

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
		w.Write([]byte(`{"status":"ok","version":"0.1.0","service":"argos-wallet"}`))
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
	})

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  time.Duration(cfg.Server.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(cfg.Server.WriteTimeout) * time.Second,
	}

	go func() {
		log.Info().Str("addr", addr).Msg("server starting")
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
	log.Info().Msg("server stopped")
}
