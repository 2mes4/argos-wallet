package openwallet

import (
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
)

type RoutingRule struct {
	ID             uuid.UUID       `json:"id"`
	WalletID       uuid.UUID       `json:"wallet_id"`
	Name           string          `json:"name"`
	Type           string          `json:"type"`
	Priority       int             `json:"priority"`
	Enabled        bool            `json:"enabled"`
	Conditions     json.RawMessage `json:"conditions"`
	Actions        json.RawMessage `json:"actions"`
	LastEvaluated  *string         `json:"last_evaluated,omitempty"`
	LastExecuted   *string         `json:"last_executed,omitempty"`
	ExecutionCount int             `json:"execution_count"`
	CreatedAt      string          `json:"created_at"`
	UpdatedAt      string          `json:"updated_at"`
}

type RuleExecution struct {
	ID            uuid.UUID       `json:"id"`
	RuleID        uuid.UUID       `json:"rule_id"`
	TransactionID *uuid.UUID      `json:"transaction_id,omitempty"`
	Status        string          `json:"status"`
	TriggerReason string          `json:"trigger_reason"`
	Result        json.RawMessage `json:"result,omitempty"`
	ExecutedAt    string          `json:"executed_at"`
}

type CreateRuleParams struct {
	WalletID   uuid.UUID       `json:"wallet_id"`
	Name       string          `json:"name"`
	Type       string          `json:"type"`
	Conditions json.RawMessage `json:"conditions"`
	Actions    json.RawMessage `json:"actions"`
	Priority   *int            `json:"priority,omitempty"`
	Enabled    *bool           `json:"enabled,omitempty"`
}

type UpdateRuleParams struct {
	Name       *string         `json:"name,omitempty"`
	Conditions json.RawMessage `json:"conditions,omitempty"`
	Actions    json.RawMessage `json:"actions,omitempty"`
	Priority   *int            `json:"priority,omitempty"`
	Enabled    *bool           `json:"enabled,omitempty"`
}

type RoutingResource struct {
	client *Client
}

func (r *RoutingResource) CreateRule(params CreateRuleParams) (*RoutingRule, error) {
	var rule RoutingRule
	err := r.client.doJSON("POST", "/v1/routing/rules", params, &rule)
	return &rule, err
}

func (r *RoutingResource) GetRule(ruleID uuid.UUID) (*RoutingRule, error) {
	var rule RoutingRule
	err := r.client.doJSON("GET", fmt.Sprintf("/v1/routing/rules/%s", ruleID), nil, &rule)
	return &rule, err
}

func (r *RoutingResource) ListRules(walletID uuid.UUID) ([]RoutingRule, error) {
	var rules []RoutingRule
	err := r.client.doJSON("GET", fmt.Sprintf("/v1/routing/rules?wallet_id=%s", walletID), nil, &rules)
	return rules, err
}

func (r *RoutingResource) UpdateRule(ruleID uuid.UUID, params UpdateRuleParams) (*RoutingRule, error) {
	var rule RoutingRule
	err := r.client.doJSON("PUT", fmt.Sprintf("/v1/routing/rules/%s", ruleID), params, &rule)
	return &rule, err
}

func (r *RoutingResource) DeleteRule(ruleID uuid.UUID) error {
	return r.client.doJSON("DELETE", fmt.Sprintf("/v1/routing/rules/%s", ruleID), nil, nil)
}

func (r *RoutingResource) ExecuteRule(ruleID uuid.UUID) (*RuleExecution, error) {
	var exec RuleExecution
	err := r.client.doJSON("POST", fmt.Sprintf("/v1/routing/rules/%s/execute", ruleID), nil, &exec)
	return &exec, err
}

func (r *RoutingResource) ListExecutions(ruleID uuid.UUID) ([]RuleExecution, error) {
	var execs []RuleExecution
	err := r.client.doJSON("GET", fmt.Sprintf("/v1/routing/rules/%s/executions", ruleID), nil, &execs)
	return execs, err
}
