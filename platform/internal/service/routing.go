package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/rs/zerolog/log"

	"github.com/2mes4/argos-wallet/platform/internal/database"
	"github.com/2mes4/argos-wallet/platform/internal/domain"
	"github.com/2mes4/argos-wallet/platform/internal/repository"
)

type RoutingService struct {
	db      *database.DB
	routeDB *repository.RoutingRepo
	txSvc   *TransactionService
}

func NewRoutingService(db *database.DB, routeDB *repository.RoutingRepo, txSvc *TransactionService) *RoutingService {
	return &RoutingService{db: db, routeDB: routeDB, txSvc: txSvc}
}

func (s *RoutingService) CreateRule(ctx context.Context, tenantSchema string, req domain.CreateRuleRequest) (*domain.RoutingRule, error) {
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	rule := &domain.RoutingRule{
		ID:         uuid.New(),
		WalletID:   req.WalletID,
		Name:       req.Name,
		Type:       req.Type,
		Priority:   req.Priority,
		Enabled:    enabled,
		Conditions: req.Conditions,
		Actions:    req.Actions,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		return s.routeDB.CreateRule(ctx, tx, rule)
	})
	if err != nil {
		return nil, fmt.Errorf("create rule: %w", err)
	}

	log.Info().Str("rule_id", rule.ID.String()).Str("type", string(rule.Type)).Msg("routing rule created")
	return rule, nil
}

func (s *RoutingService) GetRule(ctx context.Context, tenantSchema string, ruleID uuid.UUID) (*domain.RoutingRule, error) {
	var rule *domain.RoutingRule
	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		var err error
		rule, err = s.routeDB.GetRule(ctx, tx, ruleID)
		return err
	})
	return rule, err
}

func (s *RoutingService) ListRules(ctx context.Context, tenantSchema string, walletID uuid.UUID) ([]domain.RoutingRule, error) {
	var rules []domain.RoutingRule
	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		var err error
		rules, err = s.routeDB.ListRules(ctx, tx, walletID)
		return err
	})
	return rules, err
}

func (s *RoutingService) UpdateRule(ctx context.Context, tenantSchema string, ruleID uuid.UUID, req domain.UpdateRuleRequest) (*domain.RoutingRule, error) {
	var rule *domain.RoutingRule
	var err error
	_ = s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		if err = s.routeDB.UpdateRule(ctx, tx, ruleID, req); err != nil {
			return err
		}
		rule, err = s.routeDB.GetRule(ctx, tx, ruleID)
		return err
	})
	return rule, err
}

func (s *RoutingService) DeleteRule(ctx context.Context, tenantSchema string, ruleID uuid.UUID) error {
	return s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		return s.routeDB.DeleteRule(ctx, tx, ruleID)
	})
}

func (s *RoutingService) ExecuteRule(ctx context.Context, tenantSchema string, ruleID uuid.UUID, trigger domain.RuleTrigger) (*domain.RuleExecution, error) {
	var rule *domain.RoutingRule
	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		var err error
		rule, err = s.routeDB.GetRule(ctx, tx, ruleID)
		return err
	})
	if err != nil {
		return nil, err
	}

	if !rule.Enabled {
		return nil, fmt.Errorf("rule is disabled")
	}

	exec := &domain.RuleExecution{
		ID:            uuid.New(),
		RuleID:        ruleID,
		Status:        "executed",
		TriggerReason: trigger,
		ExecutedAt:    time.Now(),
	}

	switch rule.Type {
	case domain.RuleTypeSweep:
		err = s.executeSweep(ctx, tenantSchema, rule, exec)
	case domain.RuleTypeSplit:
		err = s.executeSplit(ctx, tenantSchema, rule, exec)
	case domain.RuleTypeForward:
		err = s.executeForward(ctx, tenantSchema, rule, exec)
	case domain.RuleTypeFiatOfframp:
		err = s.executeFiatOfframp(ctx, tenantSchema, rule, exec)
	default:
		return nil, fmt.Errorf("unknown rule type: %s", rule.Type)
	}

	if err != nil {
		exec.Status = "failed"
		exec.Result = json.RawMessage(`{"error":"` + err.Error() + `"}`)
	}

	_ = s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		_ = s.routeDB.CreateExecution(ctx, tx, exec)
		_ = s.routeDB.UpdateRuleTimestamps(ctx, tx, ruleID, true, exec.Status == "executed")
		return nil
	})

	return exec, nil
}

func (s *RoutingService) ListExecutions(ctx context.Context, tenantSchema string, ruleID uuid.UUID, limit int) ([]domain.RuleExecution, error) {
	var execs []domain.RuleExecution
	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		var err error
		execs, err = s.routeDB.ListExecutions(ctx, tx, ruleID, limit)
		return err
	})
	return execs, err
}

func (s *RoutingService) EvaluateOnReceive(ctx context.Context, tenantSchema string, input domain.RuleEvaluationInput) error {
	var rules []domain.RoutingRule
	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		var err error
		rules, err = s.routeDB.ListRules(ctx, tx, input.WalletID)
		return err
	})
	if err != nil {
		return err
	}

	for _, rule := range rules {
		var conditions map[string]interface{}
		if err := json.Unmarshal(rule.Conditions, &conditions); err != nil {
			continue
		}

		if !s.matchesConditions(conditions, input) {
			continue
		}

		trigger := domain.TriggerOnReceive
		if _, err := s.ExecuteRule(ctx, tenantSchema, rule.ID, trigger); err != nil {
			log.Error().Err(err).Str("rule_id", rule.ID.String()).Msg("rule execution failed")
		}
	}

	return nil
}

func (s *RoutingService) matchesConditions(conditions map[string]interface{}, input domain.RuleEvaluationInput) bool {
	if network, ok := conditions["network"].(string); ok && network != input.Network {
		return false
	}
	if token, ok := conditions["token"].(string); ok && token != input.Token {
		return false
	}
	if trigger, ok := conditions["trigger"].(string); ok && trigger != string(domain.TriggerOnReceive) {
		return false
	}
	return true
}

func (s *RoutingService) executeSweep(ctx context.Context, tenantSchema string, rule *domain.RoutingRule, exec *domain.RuleExecution) error {
	var actions domain.SweepActions
	if err := json.Unmarshal(rule.Actions, &actions); err != nil {
		return err
	}

	var conditions domain.SweepConditions
	if err := json.Unmarshal(rule.Conditions, &conditions); err != nil {
		return err
	}

	target := actions.TargetAddress
	if actions.TargetWalletID != uuid.Nil {
		target = actions.TargetWalletID.String()
	}

	tx, err := s.txSvc.CreateFromRouting(ctx, tenantSchema, rule.WalletID, rule.ID,
		domain.TxCryptoTransfer, conditions.Network, conditions.Token,
		actions.Amount, target)
	if err != nil {
		return err
	}

	exec.TransactionID = &tx.ID
	exec.Result = json.RawMessage(`{"sweep_created":true}`)
	return nil
}

func (s *RoutingService) executeSplit(ctx context.Context, tenantSchema string, rule *domain.RoutingRule, exec *domain.RuleExecution) error {
	var actions domain.SplitActions
	if err := json.Unmarshal(rule.Actions, &actions); err != nil {
		return err
	}

	var conditions domain.SplitConditions
	if err := json.Unmarshal(rule.Conditions, &conditions); err != nil {
		return err
	}

	for _, dest := range actions.Destinations {
		_, err := s.txSvc.CreateFromRouting(ctx, tenantSchema, rule.WalletID, rule.ID,
			domain.TxCryptoTransfer, conditions.Network, conditions.Token,
			fmt.Sprintf("%.2f%%", dest.Percentage), dest.TargetWalletID.String())
		if err != nil {
			return err
		}
	}

	exec.Result = json.RawMessage(`{"split_created":true,"destinations":` + string(rule.Actions) + `}`)
	return nil
}

func (s *RoutingService) executeForward(ctx context.Context, tenantSchema string, rule *domain.RoutingRule, exec *domain.RuleExecution) error {
	var actions domain.ForwardActions
	if err := json.Unmarshal(rule.Actions, &actions); err != nil {
		return err
	}

	var conditions domain.ForwardConditions
	if err := json.Unmarshal(rule.Conditions, &conditions); err != nil {
		return err
	}

	tx, err := s.txSvc.CreateFromRouting(ctx, tenantSchema, rule.WalletID, rule.ID,
		domain.TxCryptoTransfer, conditions.Network, conditions.Token,
		"all", actions.TargetWalletID.String())
	if err != nil {
		return err
	}

	exec.TransactionID = &tx.ID
	exec.Result = json.RawMessage(`{"forward_created":true}`)
	return nil
}

func (s *RoutingService) executeFiatOfframp(ctx context.Context, tenantSchema string, rule *domain.RoutingRule, exec *domain.RuleExecution) error {
	var actions domain.FiatOfframpActions
	if err := json.Unmarshal(rule.Actions, &actions); err != nil {
		return err
	}

	var conditions domain.FiatOfframpConditions
	if err := json.Unmarshal(rule.Conditions, &conditions); err != nil {
		return err
	}

	tx, err := s.txSvc.CreateFromRouting(ctx, tenantSchema, rule.WalletID, rule.ID,
		domain.TxCryptoToFiat, conditions.Network, conditions.Token,
		actions.Amount, "")
	if err != nil {
		return err
	}

	exec.TransactionID = &tx.ID
	exec.Result = json.RawMessage(`{"fiat_offramp_created":true}`)
	return nil
}
