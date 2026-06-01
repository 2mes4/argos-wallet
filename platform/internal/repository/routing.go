package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/2mes4/argos-wallet/platform/internal/domain"
)

type RoutingRepo struct{}

func NewRoutingRepo() *RoutingRepo {
	return &RoutingRepo{}
}

func (r *RoutingRepo) CreateRule(ctx context.Context, db DBTX, rule *domain.RoutingRule) error {
	_, err := db.Exec(ctx, `
		INSERT INTO routing_rules (id, wallet_id, name, type, priority, enabled, conditions, actions, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`, rule.ID, rule.WalletID, rule.Name, rule.Type, rule.Priority, rule.Enabled,
		rule.Conditions, rule.Actions, rule.CreatedAt, rule.UpdatedAt)
	return err
}

func (r *RoutingRepo) GetRule(ctx context.Context, db DBTX, id uuid.UUID) (*domain.RoutingRule, error) {
	rule := &domain.RoutingRule{}
	err := db.QueryRow(ctx, `
		SELECT id, wallet_id, name, type, priority, enabled, conditions, actions,
			last_evaluated, last_executed, execution_count, created_at, updated_at
		FROM routing_rules WHERE id = $1
	`, id).Scan(&rule.ID, &rule.WalletID, &rule.Name, &rule.Type, &rule.Priority, &rule.Enabled,
		&rule.Conditions, &rule.Actions,
		&rule.LastEvaluated, &rule.LastExecuted, &rule.ExecutionCount,
		&rule.CreatedAt, &rule.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("rule not found: %w", err)
	}
	return rule, nil
}

func (r *RoutingRepo) ListRules(ctx context.Context, db DBTX, walletID uuid.UUID) ([]domain.RoutingRule, error) {
	rows, err := db.Query(ctx, `
		SELECT id, wallet_id, name, type, priority, enabled, conditions, actions,
			last_evaluated, last_executed, execution_count, created_at, updated_at
		FROM routing_rules
		WHERE wallet_id = $1 AND enabled = true
		ORDER BY priority DESC, created_at ASC
	`, walletID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rules := []domain.RoutingRule{}
	for rows.Next() {
		var rule domain.RoutingRule
		err := rows.Scan(&rule.ID, &rule.WalletID, &rule.Name, &rule.Type, &rule.Priority, &rule.Enabled,
			&rule.Conditions, &rule.Actions,
			&rule.LastEvaluated, &rule.LastExecuted, &rule.ExecutionCount,
			&rule.CreatedAt, &rule.UpdatedAt)
		if err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}
	return rules, nil
}

func (r *RoutingRepo) UpdateRule(ctx context.Context, db DBTX, id uuid.UUID, req domain.UpdateRuleRequest) error {
	query := "UPDATE routing_rules SET updated_at = $2"
	args := []interface{}{id, time.Now()}
	argIdx := 3

	if req.Name != nil {
		query += fmt.Sprintf(", name = $%d", argIdx)
		args = append(args, *req.Name)
		argIdx++
	}
	if req.Conditions != nil {
		query += fmt.Sprintf(", conditions = $%d", argIdx)
		args = append(args, req.Conditions)
		argIdx++
	}
	if req.Actions != nil {
		query += fmt.Sprintf(", actions = $%d", argIdx)
		args = append(args, req.Actions)
		argIdx++
	}
	if req.Priority != nil {
		query += fmt.Sprintf(", priority = $%d", argIdx)
		args = append(args, *req.Priority)
		argIdx++
	}
	if req.Enabled != nil {
		query += fmt.Sprintf(", enabled = $%d", argIdx)
		args = append(args, *req.Enabled)
		argIdx++
	}

	query += " WHERE id = $1"
	_, err := db.Exec(ctx, query, args...)
	return err
}

func (r *RoutingRepo) DeleteRule(ctx context.Context, db DBTX, id uuid.UUID) error {
	_, err := db.Exec(ctx, `DELETE FROM routing_rules WHERE id = $1`, id)
	return err
}

func (r *RoutingRepo) UpdateRuleTimestamps(ctx context.Context, db DBTX, id uuid.UUID, evaluated, executed bool) error {
	query := "UPDATE routing_rules SET updated_at = $2"
	args := []interface{}{id, time.Now()}
	argIdx := 3

	if evaluated {
		query += fmt.Sprintf(", last_evaluated = $%d, execution_count = execution_count + 1", argIdx)
		args = append(args, time.Now())
		argIdx++
	}
	if executed {
		query += fmt.Sprintf(", last_executed = $%d", argIdx)
		args = append(args, time.Now())
		argIdx++
	}

	query += " WHERE id = $1"
	_, err := db.Exec(ctx, query, args...)
	return err
}

func (r *RoutingRepo) CreateExecution(ctx context.Context, db DBTX, exec *domain.RuleExecution) error {
	_, err := db.Exec(ctx, `
		INSERT INTO rule_executions (id, rule_id, transaction_id, status, trigger_reason, result, executed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, exec.ID, exec.RuleID, exec.TransactionID, exec.Status,
		exec.TriggerReason, exec.Result, exec.ExecutedAt)
	return err
}

func (r *RoutingRepo) ListExecutions(ctx context.Context, db DBTX, ruleID uuid.UUID, limit int) ([]domain.RuleExecution, error) {
	rows, err := db.Query(ctx, `
		SELECT id, rule_id, transaction_id, status, trigger_reason, result, executed_at
		FROM rule_executions
		WHERE rule_id = $1
		ORDER BY executed_at DESC
		LIMIT $2
	`, ruleID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	execs := []domain.RuleExecution{}
	for rows.Next() {
		var e domain.RuleExecution
		err := rows.Scan(&e.ID, &e.RuleID, &e.TransactionID, &e.Status,
			&e.TriggerReason, &e.Result, &e.ExecutedAt)
		if err != nil {
			return nil, err
		}
		execs = append(execs, e)
	}
	return execs, nil
}

func (r *RoutingRepo) ListActiveRulesByTrigger(ctx context.Context, db DBTX, trigger domain.RuleTrigger) ([]domain.RoutingRule, error) {
	rows, err := db.Query(ctx, `
		SELECT id, wallet_id, name, type, priority, enabled, conditions, actions,
			last_evaluated, last_executed, execution_count, created_at, updated_at
		FROM routing_rules
		WHERE enabled = true
		ORDER BY wallet_id, priority DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rules := []domain.RoutingRule{}
	for rows.Next() {
		var rule domain.RoutingRule
		err := rows.Scan(&rule.ID, &rule.WalletID, &rule.Name, &rule.Type, &rule.Priority, &rule.Enabled,
			&rule.Conditions, &rule.Actions,
			&rule.LastEvaluated, &rule.LastExecuted, &rule.ExecutionCount,
			&rule.CreatedAt, &rule.UpdatedAt)
		if err != nil {
			return nil, err
		}

		var conditions map[string]interface{}
		json.Unmarshal(rule.Conditions, &conditions)
		if t, ok := conditions["trigger"].(string); ok && domain.RuleTrigger(t) == trigger {
			rules = append(rules, rule)
		}
	}
	return rules, nil
}
