package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/2mes4/argos-wallet/platform/internal/config"
	"github.com/2mes4/argos-wallet/platform/internal/database"
	"github.com/2mes4/argos-wallet/platform/internal/worker"
)

func main() {
	cfg := config.Load()

	ctx := context.Background()

	db, err := database.New(ctx, &cfg.Database)
	if err != nil {
		log.Fatal().Err(err).Msg("database connection failed")
	}
	defer db.Close()

	scheduler := worker.NewScheduler(db, &cfg.Worker)

	scheduler.Register("tx_monitor", worker.NewTransactionMonitor(db), time.Duration(cfg.Worker.TXPollIntervalMs)*time.Millisecond)
	scheduler.Register("balance_sync", worker.NewBalanceSyncWorker(db), time.Duration(cfg.Worker.BalanceSyncIntervalMs)*time.Millisecond)
	scheduler.Register("rule_evaluator", worker.NewRuleEvaluatorWorker(db), time.Duration(cfg.Worker.RuleEvalIntervalMs)*time.Millisecond)
	scheduler.Register("sweep_executor", worker.NewSweepExecutorWorker(db), time.Duration(cfg.Worker.SweepIntervalMs)*time.Millisecond)

	go scheduler.Start(ctx)

	log.Info().Msg("worker started")

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("worker shutting down...")
	scheduler.Stop()
	log.Info().Msg("worker stopped")
}
