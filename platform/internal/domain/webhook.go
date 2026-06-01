package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Webhook struct {
	ID          uuid.UUID       `json:"id"`
	URL         string          `json:"url"`
	Events      []string        `json:"events"`
	Secret      string          `json:"-"`
	Active      bool            `json:"active"`
	LastFiredAt *time.Time      `json:"last_fired_at,omitempty"`
	LastStatus  string          `json:"last_status,omitempty"`
	FailCount   int             `json:"fail_count"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type WebhookDelivery struct {
	ID         uuid.UUID       `json:"id"`
	WebhookID  uuid.UUID       `json:"webhook_id"`
	Event      string          `json:"event"`
	Payload    json.RawMessage `json:"payload"`
	StatusCode int             `json:"status_code"`
	Response   string          `json:"response,omitempty"`
	DeliveredAt time.Time      `json:"delivered_at"`
}

type CreateWebhookRequest struct {
	URL    string   `json:"url"`
	Events []string `json:"events"`
}

const (
	WebhookEventTransactionCreated  = "transaction.created"
	WebhookEventTransactionConfirmed = "transaction.confirmed"
	WebhookEventTransactionFailed    = "transaction.failed"
	WebhookEventWalletCreated        = "wallet.created"
	WebhookEventWalletDeactivated    = "wallet.deactivated"
	WebhookEventRuleExecuted         = "rule.executed"
	WebhookEventRuleFailed           = "rule.failed"
	WebhookEventPaymentReceived      = "payment.received"
)
