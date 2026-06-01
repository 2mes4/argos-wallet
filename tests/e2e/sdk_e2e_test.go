package tests

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	ow "github.com/2mes4/argos-wallet/sdks/go"
)

func TestE2E_FullSDKWorkflow(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	client, err := ow.NewClient(ow.Config{
		APIKey:  app.APIKey,
		BaseURL: app.Server.URL,
	})
	require.NoError(t, err)

	t.Run("Create wallet via SDK", func(t *testing.T) {
		wallet, err := client.Wallets.Create(ow.CreateWalletParams{
			ExternalID: "e2e-user-001",
			Networks:   []string{"polygon"},
		})
		require.NoError(t, err)
		assert.NotEmpty(t, wallet.ID)
		assert.Equal(t, "active", wallet.Status)
		assert.NotEmpty(t, wallet.Addresses["polygon"])
	})

	t.Run("Create and retrieve wallet", func(t *testing.T) {
		wallet, err := client.Wallets.Create(ow.CreateWalletParams{
			ExternalID: "e2e-user-002",
			Networks:   []string{"polygon", "ethereum"},
		})
		require.NoError(t, err)

		fetched, err := client.Wallets.Get(wallet.ID)
		require.NoError(t, err)
		assert.Equal(t, wallet.ID, fetched.ID)
		assert.Equal(t, "e2e-user-002", fetched.ExternalID)
	})

	t.Run("Link and list external wallet", func(t *testing.T) {
		wallet, _ := client.Wallets.Create(ow.CreateWalletParams{
			Networks: []string{"polygon"},
		})

		conn, err := client.Wallets.LinkExternal(wallet.ID, ow.LinkExternalParams{
			Provider: "metamask",
			Address:  "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
			ChainID:  137,
		})
		require.NoError(t, err)
		assert.Equal(t, "metamask", conn.Provider)

		conns, err := client.Wallets.ListConnections(wallet.ID)
		require.NoError(t, err)
		assert.Equal(t, 1, len(conns))
	})

	t.Run("Sign and verify message", func(t *testing.T) {
		wallet, _ := client.Wallets.Create(ow.CreateWalletParams{
			Networks: []string{"polygon"},
		})

		sig, err := client.Identity.SignMessage(wallet.ID, "e2e auth challenge")
		require.NoError(t, err)
		assert.NotEmpty(t, sig.Signature)
		assert.NotEmpty(t, sig.Address)

		valid, err := client.Identity.VerifySignature("e2e auth challenge", sig.Signature, sig.Address)
		require.NoError(t, err)
		assert.True(t, valid.Valid)
	})

	t.Run("Create and execute routing rule", func(t *testing.T) {
		wallet, _ := client.Wallets.Create(ow.CreateWalletParams{
			Networks: []string{"polygon"},
		})

		conditions, _ := json.Marshal(map[string]interface{}{
			"network": "polygon", "token": "USDC", "threshold": "100", "trigger": "manual",
		})
		actions, _ := json.Marshal(map[string]interface{}{
			"target_type": "wallet", "target_wallet_id": wallet.ID, "amount": "all",
		})

		rule, err := client.Routing.CreateRule(ow.CreateRuleParams{
			WalletID:   wallet.ID,
			Name:       "E2E Sweep Rule",
			Type:       "sweep",
			Conditions: conditions,
			Actions:    actions,
		})
		require.NoError(t, err)
		assert.True(t, rule.Enabled)

		exec, err := client.Routing.ExecuteRule(rule.ID)
		require.NoError(t, err)
		assert.Equal(t, "executed", exec.Status)

		execs, err := client.Routing.ListExecutions(rule.ID)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(execs), 1)
	})

	t.Run("List and filter transactions", func(t *testing.T) {
		wallet, _ := client.Wallets.Create(ow.CreateWalletParams{
			Networks: []string{"polygon"},
		})

		txs, err := client.Transactions.List(ow.ListTransactionsParams{
			WalletID: &wallet.ID,
		})
		require.NoError(t, err)
		assert.Equal(t, 0, len(txs))
	})

	t.Run("Wallet balances", func(t *testing.T) {
		wallet, _ := client.Wallets.Create(ow.CreateWalletParams{
			Networks: []string{"polygon"},
		})

		balances, err := client.Wallets.GetBalances(wallet.ID)
		require.NoError(t, err)
		_ = balances
	})

	t.Run("Wallet addresses", func(t *testing.T) {
		wallet, _ := client.Wallets.Create(ow.CreateWalletParams{
			Networks: []string{"polygon", "ethereum", "base"},
		})

		addresses, err := client.Wallets.GetAddresses(wallet.ID)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(addresses), 1)
	})

	t.Run("Delete routing rule", func(t *testing.T) {
		wallet, _ := client.Wallets.Create(ow.CreateWalletParams{
			Networks: []string{"polygon"},
		})

		conditions, _ := json.Marshal(map[string]interface{}{"network": "polygon", "trigger": "manual"})
		actions, _ := json.Marshal(map[string]interface{}{"target_wallet_id": wallet.ID})

		rule, _ := client.Routing.CreateRule(ow.CreateRuleParams{
			WalletID:   wallet.ID,
			Name:       "To Delete",
			Type:       "sweep",
			Conditions: conditions,
			Actions:    actions,
		})

		err := client.Routing.DeleteRule(rule.ID)
		require.NoError(t, err)
	})

	t.Run("Deactivate wallet", func(t *testing.T) {
		wallet, _ := client.Wallets.Create(ow.CreateWalletParams{
			Networks: []string{"polygon"},
		})

		err := client.Wallets.Deactivate(wallet.ID)
		require.NoError(t, err)

		fetched, _ := client.Wallets.Get(wallet.ID)
		assert.Equal(t, "suspended", fetched.Status)
	})
}

func TestE2E_ErrorHandling(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	t.Run("Invalid API key", func(t *testing.T) {
		_, err := ow.NewClient(ow.Config{
			APIKey:  "invalid-key",
			BaseURL: app.Server.URL,
		})
		require.NoError(t, err)
	})

	t.Run("Get non-existent wallet", func(t *testing.T) {
		client, _ := ow.NewClient(ow.Config{
			APIKey:  app.APIKey,
			BaseURL: app.Server.URL,
		})

		_, err := client.Wallets.Get(uuid.Nil)
		assert.Error(t, err)
	})
}

func TestE2E_MultiTenantWorkflow(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	tenant1, key1, _ := app.TenantSvc.Register(context.Background(), domain.CreateTenantRequest{
		Name: "Tenant E2E 1",
	})
	tenant2, key2, _ := app.TenantSvc.Register(context.Background(), domain.CreateTenantRequest{
		Name: "Tenant E2E 2",
	})

	require.NotEqual(t, tenant1.ID, tenant2.ID)
	require.NotEqual(t, key1.APIKey, key2.APIKey)

	client1, _ := ow.NewClient(ow.Config{APIKey: key1.APIKey, BaseURL: app.Server.URL})
	client2, _ := ow.NewClient(ow.Config{APIKey: key2.APIKey, BaseURL: app.Server.URL})

	wallet1, err := client1.Wallets.Create(ow.CreateWalletParams{
		ExternalID: "tenant1-user",
	})
	require.NoError(t, err)

	_, err = client2.Wallets.Get(wallet1.ID)
	assert.Error(t, err, "tenant 2 should not access tenant 1's wallet")

	wallet2, err := client2.Wallets.Create(ow.CreateWalletParams{
		ExternalID: "tenant2-user",
	})
	require.NoError(t, err)
	require.NotEqual(t, wallet1.ID, wallet2.ID)
}
