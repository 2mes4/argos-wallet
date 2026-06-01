package worker

import (
	"context"

	"github.com/rs/zerolog/log"

	"github.com/2mes4/argos-wallet/platform/internal/database"
)

type TransactionMonitor struct {
	db *database.DB
}

func NewTransactionMonitor(db *database.DB) *TransactionMonitor {
	return &TransactionMonitor{db: db}
}

func (w *TransactionMonitor) Name() string { return "tx_monitor" }

func (w *TransactionMonitor) Run(ctx context.Context) error {
	log.Debug().Msg("checking pending transactions...")
	return nil
}

type BalanceSyncWorker struct {
	db *database.DB
}

func NewBalanceSyncWorker(db *database.DB) *BalanceSyncWorker {
	return &BalanceSyncWorker{db: db}
}

func (w *BalanceSyncWorker) Name() string { return "balance_sync" }

func (w *BalanceSyncWorker) Run(ctx context.Context) error {
	log.Debug().Msg("syncing wallet balances...")
	return nil
}

type RuleEvaluatorWorker struct {
	db *database.DB
}

func NewRuleEvaluatorWorker(db *database.DB) *RuleEvaluatorWorker {
	return &RuleEvaluatorWorker{db: db}
}

func (w *RuleEvaluatorWorker) Name() string { return "rule_evaluator" }

func (w *RuleEvaluatorWorker) Run(ctx context.Context) error {
	log.Debug().Msg("evaluating routing rules...")
	return nil
}

type SweepExecutorWorker struct {
	db *database.DB
}

func NewSweepExecutorWorker(db *database.DB) *SweepExecutorWorker {
	return &SweepExecutorWorker{db: db}
}

func (w *SweepExecutorWorker) Name() string { return "sweep_executor" }

func (w *SweepExecutorWorker) Run(ctx context.Context) error {
	log.Debug().Msg("executing sweep rules...")
	return nil
}
