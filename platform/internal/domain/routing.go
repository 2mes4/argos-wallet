package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type RuleType string

const (
	RuleTypeSweep      RuleType = "sweep"
	RuleTypeSplit      RuleType = "split"
	RuleTypeForward    RuleType = "forward"
	RuleTypeFiatOfframp RuleType = "fiat_offramp"
)

type RuleTrigger string

const (
	TriggerOnReceive RuleTrigger = "on_receive"
	TriggerScheduled RuleTrigger = "scheduled"
	TriggerManual    RuleTrigger = "manual"
)

type RoutingRule struct {
	ID             uuid.UUID       `json:"id"`
	WalletID       uuid.UUID       `json:"wallet_id"`
	Name           string          `json:"name"`
	Type           RuleType        `json:"type"`
	Priority       int             `json:"priority"`
	Enabled        bool            `json:"enabled"`
	Conditions     json.RawMessage `json:"conditions"`
	Actions        json.RawMessage `json:"actions"`
	LastEvaluated  *time.Time      `json:"last_evaluated,omitempty"`
	LastExecuted   *time.Time      `json:"last_executed,omitempty"`
	ExecutionCount int             `json:"execution_count"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

type SweepConditions struct {
	Network   string `json:"network"`
	Token     string `json:"token"`
	Threshold string `json:"threshold"`
	Trigger   RuleTrigger `json:"trigger"`
	Schedule  string `json:"schedule,omitempty"`
}

type SweepActions struct {
	TargetType     string    `json:"target_type"`
	TargetWalletID uuid.UUID `json:"target_wallet_id,omitempty"`
	TargetAddress  string    `json:"target_address,omitempty"`
	Amount         string    `json:"amount"`
	KeepMinimum    string    `json:"keep_minimum,omitempty"`
}

type SplitConditions struct {
	Network  string      `json:"network"`
	Token    string      `json:"token"`
	Trigger  RuleTrigger `json:"trigger"`
	Schedule string      `json:"schedule,omitempty"`
}

type SplitDestination struct {
	TargetWalletID uuid.UUID `json:"target_wallet_id"`
	Percentage     float64   `json:"percentage"`
}

type SplitActions struct {
	Destinations []SplitDestination `json:"destinations"`
}

type ForwardConditions struct {
	Network  string      `json:"network"`
	Token    string      `json:"token"`
	Trigger  RuleTrigger `json:"trigger"`
	Schedule string      `json:"schedule,omitempty"`
}

type ForwardActions struct {
	TargetWalletID uuid.UUID `json:"target_wallet_id"`
}

type FiatOfframpConditions struct {
	Network   string      `json:"network"`
	Token     string      `json:"token"`
	Threshold string      `json:"threshold"`
	Trigger   RuleTrigger `json:"trigger"`
	Schedule  string      `json:"schedule,omitempty"`
}

type FiatOfframpActions struct {
	TargetCurrency      string `json:"target_currency"`
	TargetBankAccountID string `json:"target_bank_account_id"`
	Amount              string `json:"amount"`
}

type CreateRuleRequest struct {
	WalletID   uuid.UUID       `json:"wallet_id" validate:"required"`
	Name       string          `json:"name" validate:"required"`
	Type       RuleType        `json:"type" validate:"required"`
	Conditions json.RawMessage `json:"conditions" validate:"required"`
	Actions    json.RawMessage `json:"actions" validate:"required"`
	Priority   int             `json:"priority,omitempty"`
	Enabled    *bool           `json:"enabled,omitempty"`
}

type UpdateRuleRequest struct {
	Name       *string         `json:"name,omitempty"`
	Conditions json.RawMessage `json:"conditions,omitempty"`
	Actions    json.RawMessage `json:"actions,omitempty"`
	Priority   *int            `json:"priority,omitempty"`
	Enabled    *bool           `json:"enabled,omitempty"`
}

type RuleExecution struct {
	ID            uuid.UUID       `json:"id"`
	RuleID        uuid.UUID       `json:"rule_id"`
	TransactionID *uuid.UUID      `json:"transaction_id,omitempty"`
	Status        string          `json:"status"`
	TriggerReason RuleTrigger     `json:"trigger_reason"`
	Result        json.RawMessage `json:"result,omitempty"`
	ExecutedAt    time.Time       `json:"executed_at"`
}

type RuleEvaluationInput struct {
	WalletID uuid.UUID
	Network  string
	Token    string
	Amount   string
	Trigger  RuleTrigger
}
