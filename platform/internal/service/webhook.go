package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/rs/zerolog/log"

	"github.com/2mes4/argos-wallet/platform/internal/database"
	"github.com/2mes4/argos-wallet/platform/internal/domain"
)

type WebhookService struct {
	db *database.DB
	mu sync.Mutex
}

func NewWebhookService(db *database.DB) *WebhookService {
	return &WebhookService{db: db}
}

func (s *WebhookService) Create(ctx context.Context, tenantSchema string, req domain.CreateWebhookRequest) (*domain.Webhook, error) {
	wh := &domain.Webhook{
		ID:        uuid.New(),
		URL:       req.URL,
		Events:    req.Events,
		Secret:    uuid.New().String(),
		Active:    true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		eventsJSON, _ := json.Marshal(wh.Events)
		_, err := tx.Exec(ctx, `
			INSERT INTO webhooks (id, url, events, secret, active, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, wh.ID, wh.URL, eventsJSON, wh.Secret, wh.Active, wh.CreatedAt, wh.UpdatedAt)
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("create webhook: %w", err)
	}

	log.Info().Str("webhook_id", wh.ID.String()).Str("url", wh.URL).Msg("webhook created")
	return wh, nil
}

func (s *WebhookService) List(ctx context.Context, tenantSchema string) ([]domain.Webhook, error) {
	var webhooks []domain.Webhook
	err := s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		rows, err := tx.Query(ctx, `SELECT id, url, events, secret, active, fail_count, created_at FROM webhooks WHERE active = true ORDER BY created_at DESC`)
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var wh domain.Webhook
			var eventsJSON []byte
			if err := rows.Scan(&wh.ID, &wh.URL, &eventsJSON, &wh.Secret, &wh.Active, &wh.FailCount, &wh.CreatedAt); err != nil {
				return err
			}
			json.Unmarshal(eventsJSON, &wh.Events)
			webhooks = append(webhooks, wh)
		}
		return nil
	})
	return webhooks, err
}

func (s *WebhookService) Delete(ctx context.Context, tenantSchema string, id uuid.UUID) error {
	return s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		_, err := tx.Exec(ctx, `DELETE FROM webhooks WHERE id = $1`, id)
		return err
	})
}

// Dispatch fires webhooks for a given event type
func (s *WebhookService) Dispatch(ctx context.Context, tenantSchema string, event string, payload interface{}) {
	webhooks, err := s.List(ctx, tenantSchema)
	if err != nil {
		log.Error().Err(err).Msg("list webhooks for dispatch")
		return
	}

	payloadBytes, _ := json.Marshal(payload)

	for _, wh := range webhooks {
		if !s.eventMatches(wh.Events, event) {
			continue
		}
		go s.deliver(ctx, tenantSchema, wh, event, payloadBytes)
	}
}

func (s *WebhookService) deliver(ctx context.Context, tenantSchema string, wh domain.Webhook, event string, payload []byte) {
	delivery := &domain.WebhookDelivery{
		ID:          uuid.New(),
		WebhookID:   wh.ID,
		Event:       event,
		Payload:     payload,
		DeliveredAt: time.Now(),
	}

	mac := hmac.New(sha256.New, []byte(wh.Secret))
	mac.Write(payload)
	signature := hex.EncodeToString(mac.Sum(nil))

	req, err := http.NewRequestWithContext(ctx, "POST", wh.URL, bytes.NewReader(payload))
	if err != nil {
		log.Error().Err(err).Msg("webhook request creation failed")
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Argos-Event", event)
	req.Header.Set("X-Argos-Signature", signature)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		delivery.StatusCode = 0
		delivery.Response = err.Error()
	} else {
		defer resp.Body.Close()
		delivery.StatusCode = resp.StatusCode
	}

	deliverySuccess := delivery.StatusCode >= 200 && delivery.StatusCode < 300

	s.db.WithTenant(ctx, tenantSchema, func(ctx context.Context, tx pgx.Tx) error {
		_, err := tx.Exec(ctx, `
			INSERT INTO webhook_deliveries (id, webhook_id, event, payload, status_code, response, delivered_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, delivery.ID, delivery.WebhookID, delivery.Event, delivery.Payload, delivery.StatusCode, delivery.Response, delivery.DeliveredAt)
		if err != nil {
			return err
		}

		if deliverySuccess {
			_, err = tx.Exec(ctx, `UPDATE webhooks SET last_fired_at = $1, last_status = 'success', fail_count = 0 WHERE id = $2`, time.Now(), wh.ID)
		} else {
			_, err = tx.Exec(ctx, `UPDATE webhooks SET last_fired_at = $1, last_status = 'failed', fail_count = fail_count + 1 WHERE id = $2`, time.Now(), wh.ID)
		}
		return err
	})

	if deliverySuccess {
		log.Info().Str("webhook_id", wh.ID.String()).Str("event", event).Int("status", delivery.StatusCode).Msg("webhook delivered")
	} else {
		log.Warn().Str("webhook_id", wh.ID.String()).Str("event", event).Int("status", delivery.StatusCode).Msg("webhook delivery failed")
	}
}

func (s *WebhookService) eventMatches(subscribed []string, event string) bool {
	for _, e := range subscribed {
		if e == "*" || e == event {
			return true
		}
		// Support wildcard like "transaction.*"
		if len(e) > 2 && e[len(e)-2:] == ".*" {
			prefix := e[:len(e)-1]
			if len(event) >= len(prefix) && event[:len(prefix)] == prefix {
				return true
			}
		}
	}
	return false
}
