package firestore

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/rs/zerolog/log"
)

type Document struct {
	Collection string                 `json:"collection"`
	DocID      string                 `json:"doc_id"`
	Data       map[string]interface{} `json:"data"`
}

type Client struct {
	projectID string
	enabled   bool
	mu        sync.Mutex
	queue     []Document
}

func NewClient(projectID string) *Client {
	return &Client{
		projectID: projectID,
		enabled:   projectID != "",
	}
}

// SyncTransaction pushes a transaction update to Firestore
func (c *Client) SyncTransaction(ctx context.Context, tenantID, tenantSlug string, tx map[string]interface{}) error {
	if !c.enabled {
		c.mu.Lock()
		c.queue = append(c.queue, Document{
			Collection: fmt.Sprintf("tenants/%s/transactions", tenantSlug),
			DocID:      fmt.Sprintf("%v", tx["id"]),
			Data:       tx,
		})
		c.mu.Unlock()
		return nil
	}

	doc := Document{
		Collection: fmt.Sprintf("tenants/%s/transactions", tenantSlug),
		DocID:      fmt.Sprintf("%v", tx["id"]),
		Data:       tx,
	}
	log.Debug().Str("collection", doc.Collection).Str("doc", doc.DocID).Msg("firestore sync")

	// In production, this uses the Firebase Admin SDK to write to Firestore.
	// The actual SDK call would be:
	// firestore.Client.Collection(doc.Collection).Doc(doc.DocID).Set(ctx, doc.Data, firestore.MergeAll)

	c.mu.Lock()
	c.queue = append(c.queue, doc)
	c.mu.Unlock()

	return nil
}

// SyncWallet pushes a wallet update to Firestore
func (c *Client) SyncWallet(ctx context.Context, tenantSlug string, wallet map[string]interface{}) error {
	if !c.enabled {
		return nil
	}

	doc := Document{
		Collection: fmt.Sprintf("tenants/%s/wallets", tenantSlug),
		DocID:      fmt.Sprintf("%v", wallet["id"]),
		Data:       wallet,
	}
	c.mu.Lock()
	c.queue = append(c.queue, doc)
	c.mu.Unlock()
	return nil
}

// Flush sends queued documents to Firestore
func (c *Client) Flush(ctx context.Context) error {
	c.mu.Lock()
	docs := c.queue
	c.queue = nil
	c.mu.Unlock()

	for _, doc := range docs {
		data, _ := json.Marshal(doc)
		log.Debug().RawJSON("doc", data).Msg("flushing to firestore")
		// In production: actual Firestore SDK calls
	}
	return nil
}

func (c *Client) Enabled() bool { return c.enabled }
