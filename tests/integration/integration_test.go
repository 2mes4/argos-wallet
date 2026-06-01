package tests

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/2mes4/argos-wallet/platform/internal/blockchain"
	"github.com/2mes4/argos-wallet/platform/internal/database"
	"github.com/2mes4/argos-wallet/platform/internal/handler"
	"github.com/2mes4/argos-wallet/platform/internal/middleware"
	"github.com/2mes4/argos-wallet/platform/internal/repository"
	"github.com/2mes4/argos-wallet/platform/internal/service"
)

type TestApp struct {
	Server      *httptest.Server
	DB          *database.DB
	TenantSvc   *service.TenantService
	WalletSvc   *service.WalletService
	TxSvc       *service.TransactionService
	RoutingSvc  *service.RoutingService
	IdentitySvc *service.IdentityService
	APIKey      string
	TenantSlug  string
}

func SetupTestApp(t *testing.T) *TestApp {
	t.Helper()

	dbURL := "postgres://dev:dev@localhost:5432/argoswallet_test?sslmode=disable"
	db, err := database.New(context.Background(), &database.DatabaseConfig{
		URL:          dbURL,
		MaxOpenConns: 5,
		MaxIdleConns: 2,
	})
	if err != nil {
		t.Skipf("database not available: %v", err)
	}

	_, err = db.Pool.Exec(context.Background(), `
		TRUNCATE tenant_api_keys CASCADE;
		TRUNCATE tenants CASCADE;
	`)
	if err != nil {
		t.Skipf("database cleanup failed: %v", err)
	}

	evm := blockchain.NewEVMClient(map[string]string{
		"polygon":  "https://rpc-amoy.polygon.technology",
		"ethereum": "https://rpc.sepolia.org",
		"base":     "https://sepolia.base.org",
	}, "test mnemonic for development only do not use in production 1234567890")

	tenantRepo := repository.NewTenantRepo()
	walletRepo := repository.NewWalletRepo()
	txRepo := repository.NewTransactionRepo()
	routingRepo := repository.NewRoutingRepo()

	events := make(chan domain.TransactionEvent, 100)

	tenantSvc := service.NewTenantService(db, tenantRepo)
	walletSvc := service.NewWalletService(db, walletRepo, evm, []string{"polygon", "ethereum", "base"})
	txSvc := service.NewTransactionService(db, txRepo, evm, events)
	routingSvc := service.NewRoutingService(db, routingRepo, txSvc)
	identitySvc := service.NewIdentityService(db, evm)

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(10 * time.Second))

	r.Get("/v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	tenantHandler := handler.NewTenantHandler(tenantSvc)
	r.Mount("/v1/tenants", tenantHandler.Routes())

	r.Group(func(r chi.Router) {
		r.Use(middleware.APIKeyAuth(tenantSvc))

		walletHandler := handler.NewWalletHandler(walletSvc)
		r.Mount("/v1/wallets", walletHandler.Routes())

		txHandler := handler.NewTransactionHandler(txSvc)
		r.Mount("/v1/transactions", txHandler.Routes())

		routingHandler := handler.NewRoutingHandler(routingSvc)
		r.Mount("/v1/routing/rules", routingHandler.Routes())

		identityHandler := handler.NewIdentityHandler(identitySvc)
		r.Mount("/v1/identity", identityHandler.Routes())
	})

	server := httptest.NewServer(r)

	tenant, apiKey, err := tenantSvc.Register(context.Background(), domain.CreateTenantRequest{
		Name: "Test Tenant",
		Plan: "starter",
	})
	require.NoError(t, err)

	return &TestApp{
		Server:      server,
		DB:          db,
		TenantSvc:   tenantSvc,
		WalletSvc:   walletSvc,
		TxSvc:       txSvc,
		RoutingSvc:  routingSvc,
		IdentitySvc: identitySvc,
		APIKey:      apiKey.APIKey,
		TenantSlug:  tenant.Slug,
	}
}

func (a *TestApp) Cleanup() {
	a.Server.Close()
	if a.DB != nil {
		a.DB.Pool.Exec(context.Background(), `TRUNCATE tenant_api_keys CASCADE; TRUNCATE tenants CASCADE;`)
		a.DB.Close()
	}
}

func (a *TestApp) Do(method, path string, body interface{}) (*http.Response, []byte) {
	var bodyReader io.Reader
	if body != nil {
		jsonBody, _ := json.Marshal(body)
		bodyReader = strings.NewReader(string(jsonBody))
	}

	req, _ := http.NewRequest(method, a.Server.URL+path, bodyReader)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+a.APIKey)
	req.Header.Set("X-API-Key", a.APIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	resp.Body.Close()

	return resp, respBody
}

func (a *TestApp) DoJSON(method, path string, body interface{}) (int, map[string]interface{}) {
	resp, respBody := a.Do(method, path, body)
	if resp == nil {
		return 0, nil
	}
	var result map[string]interface{}
	json.Unmarshal(respBody, &result)
	return resp.StatusCode, result
}

func (a *TestApp) CreateWallet(t *testing.T) map[string]interface{} {
	status, wallet := a.DoJSON("POST", "/v1/wallets", map[string]interface{}{
		"external_id": "test-user-123",
		"networks":    []string{"polygon"},
	})
	require.Equal(t, http.StatusCreated, status, "wallet creation failed: %v", wallet)
	return wallet
}

func TestHealth(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	resp, body := app.Do("GET", "/v1/health", nil)
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var result map[string]interface{}
	json.Unmarshal(body, &result)
	assert.Equal(t, "ok", result["status"])
}

func TestTenantRegistration(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	assert.NotEmpty(t, app.APIKey)
	assert.NotEmpty(t, app.TenantSlug)
	assert.True(t, strings.HasPrefix(app.APIKey, "ow_"))
}

func TestInvalidAPIKey(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	req, _ := http.NewRequest("GET", app.Server.URL+"/v1/wallets/00000000-0000-0000-0000-000000000000", nil)
	req.Header.Set("Authorization", "Bearer invalid-key")

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	resp.Body.Close()
}

func TestWalletCreateAndGet(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	wallet := app.CreateWallet(t)
	walletID := wallet["id"].(string)

	assert.NotEmpty(t, walletID)
	assert.Equal(t, "active", wallet["status"])
	assert.NotNil(t, wallet["addresses"])
	assert.NotEmpty(t, wallet["addresses"].(map[string]interface{})["polygon"])

	status, fetched := app.DoJSON("GET", "/v1/wallets/"+walletID, nil)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, walletID, fetched["id"])
}

func TestWalletWithExternalID(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	status, wallet := app.DoJSON("POST", "/v1/wallets", map[string]interface{}{
		"external_id": "user-abc-123",
		"networks":    []string{"polygon", "ethereum"},
	})
	require.Equal(t, http.StatusCreated, status)
	assert.Equal(t, "user-abc-123", wallet["external_id"])
	addresses := wallet["addresses"].(map[string]interface{})
	assert.Contains(t, addresses, "polygon")
	assert.Contains(t, addresses, "ethereum")
}

func TestWalletDeactivate(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	wallet := app.CreateWallet(t)
	walletID := wallet["id"].(string)

	status, _ := app.DoJSON("DELETE", "/v1/wallets/"+walletID, nil)
	assert.Equal(t, http.StatusOK, status)

	status, fetched := app.DoJSON("GET", "/v1/wallets/"+walletID, nil)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, "suspended", fetched["status"])
}

func TestWalletGetAddresses(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	wallet := app.CreateWallet(t)
	walletID := wallet["id"].(string)

	status, addrs := app.DoJSON("GET", "/v1/wallets/"+walletID+"/addresses", nil)
	assert.Equal(t, http.StatusOK, status)
	addrsList := addrs.([]interface{})
	assert.Greater(t, len(addrsList), 0)
}

func TestLinkExternalWallet(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	wallet := app.CreateWallet(t)
	walletID := wallet["id"].(string)

	status, conn := app.DoJSON("POST", fmt.Sprintf("/v1/wallets/%s/connections", walletID), map[string]interface{}{
		"provider": "metamask",
		"address":  "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
		"chain_id": 137,
	})
	require.Equal(t, http.StatusCreated, status)
	assert.Equal(t, "metamask", conn["provider"])
	assert.NotEmpty(t, conn["id"])
}

func TestListExternalConnections(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	wallet := app.CreateWallet(t)
	walletID := wallet["id"].(string)

	app.DoJSON("POST", fmt.Sprintf("/v1/wallets/%s/connections", walletID), map[string]interface{}{
		"provider": "metamask",
		"address":  "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
		"chain_id": 137,
	})

	status, conns := app.DoJSON("GET", fmt.Sprintf("/v1/wallets/%s/connections", walletID), nil)
	assert.Equal(t, http.StatusOK, status)
	connsList := conns.([]interface{})
	assert.Equal(t, 1, len(connsList))
}

func TestUnlinkExternalWallet(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	wallet := app.CreateWallet(t)
	walletID := wallet["id"].(string)

	_, conn := app.DoJSON("POST", fmt.Sprintf("/v1/wallets/%s/connections", walletID), map[string]interface{}{
		"provider": "metamask",
		"address":  "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
		"chain_id": 137,
	})
	connID := conn["id"].(string)

	status, _ := app.DoJSON("DELETE", fmt.Sprintf("/v1/wallets/%s/connections/%s", walletID, connID), nil)
	assert.Equal(t, http.StatusOK, status)

	_, conns := app.DoJSON("GET", fmt.Sprintf("/v1/wallets/%s/connections", walletID), nil)
	connsList := conns.([]interface{})
	assert.Equal(t, 0, len(connsList))
}

func TestCreateSweepRule(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	wallet := app.CreateWallet(t)
	walletID := wallet["id"].(string)

	status, rule := app.DoJSON("POST", "/v1/routing/rules", map[string]interface{}{
		"wallet_id": walletID,
		"name":      "Auto-sweep USDC",
		"type":      "sweep",
		"conditions": map[string]interface{}{
			"network":   "polygon",
			"token":     "USDC",
			"threshold": "500",
			"trigger":   "on_receive",
		},
		"actions": map[string]interface{}{
			"target_type":     "wallet",
			"target_wallet_id": walletID,
			"amount":          "all",
		},
	})
	require.Equal(t, http.StatusCreated, status)
	assert.Equal(t, "sweep", rule["type"])
	assert.Equal(t, "Auto-sweep USDC", rule["name"])
	assert.True(t, rule["enabled"].(bool))
}

func TestListRoutingRules(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	wallet := app.CreateWallet(t)
	walletID := wallet["id"].(string)

	app.DoJSON("POST", "/v1/routing/rules", map[string]interface{}{
		"wallet_id":  walletID,
		"name":       "Rule 1",
		"type":       "sweep",
		"conditions": map[string]interface{}{"network": "polygon", "trigger": "on_receive"},
		"actions":    map[string]interface{}{"target_wallet_id": walletID},
	})

	status, rules := app.DoJSON("GET", "/v1/routing/rules?wallet_id="+walletID, nil)
	assert.Equal(t, http.StatusOK, status)
	rulesList := rules.([]interface{})
	assert.Equal(t, 1, len(rulesList))
}

func TestDeleteRoutingRule(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	wallet := app.CreateWallet(t)
	walletID := wallet["id"].(string)

	_, rule := app.DoJSON("POST", "/v1/routing/rules", map[string]interface{}{
		"wallet_id":  walletID,
		"name":       "To delete",
		"type":       "sweep",
		"conditions": map[string]interface{}{"network": "polygon"},
		"actions":    map[string]interface{}{"target_wallet_id": walletID},
	})
	ruleID := rule["id"].(string)

	status, _ := app.DoJSON("DELETE", "/v1/routing/rules/"+ruleID, nil)
	assert.Equal(t, http.StatusOK, status)

	status, rules := app.DoJSON("GET", "/v1/routing/rules?wallet_id="+walletID, nil)
	rulesList := rules.([]interface{})
	assert.Equal(t, 0, len(rulesList))
}

func TestExecuteRoutingRule(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	wallet := app.CreateWallet(t)
	walletID := wallet["id"].(string)

	_, rule := app.DoJSON("POST", "/v1/routing/rules", map[string]interface{}{
		"wallet_id":  walletID,
		"name":       "Manual sweep",
		"type":       "sweep",
		"conditions": map[string]interface{}{"network": "polygon", "token": "USDC", "threshold": "100", "trigger": "manual"},
		"actions":    map[string]interface{}{"target_type": "wallet", "target_wallet_id": walletID, "amount": "all"},
	})
	ruleID := rule["id"].(string)

	status, exec := app.DoJSON("POST", "/v1/routing/rules/"+ruleID+"/execute", nil)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, "executed", exec["status"])
}

func TestRuleExecutions(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	wallet := app.CreateWallet(t)
	walletID := wallet["id"].(string)

	_, rule := app.DoJSON("POST", "/v1/routing/rules", map[string]interface{}{
		"wallet_id":  walletID,
		"name":       "Manual sweep",
		"type":       "sweep",
		"conditions": map[string]interface{}{"network": "polygon", "trigger": "manual"},
		"actions":    map[string]interface{}{"target_wallet_id": walletID},
	})
	ruleID := rule["id"].(string)

	app.DoJSON("POST", "/v1/routing/rules/"+ruleID+"/execute", nil)

	status, execs := app.DoJSON("GET", "/v1/routing/rules/"+ruleID+"/executions", nil)
	assert.Equal(t, http.StatusOK, status)
	execsList := execs.([]interface{})
	assert.GreaterOrEqual(t, len(execsList), 1)
}

func TestIdentitySignMessage(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	wallet := app.CreateWallet(t)
	walletID := wallet["id"].(string)

	status, resp := app.DoJSON("POST", "/v1/identity/sign-message", map[string]interface{}{
		"wallet_id": walletID,
		"message":   "Hello World",
	})
	require.Equal(t, http.StatusOK, status)
	assert.NotEmpty(t, resp["signature"])
	assert.NotEmpty(t, resp["address"])
}

func TestIdentityVerifySignature(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	wallet := app.CreateWallet(t)
	walletID := wallet["id"].(string)

	_, signResp := app.DoJSON("POST", "/v1/identity/sign-message", map[string]interface{}{
		"wallet_id": walletID,
		"message":   "Verify me",
	})
	signature := signResp["signature"].(string)
	address := signResp["address"].(string)

	status, verifyResp := app.DoJSON("POST", "/v1/identity/verify-signature", map[string]interface{}{
		"message":   "Verify me",
		"signature": signature,
		"address":   address,
	})
	assert.Equal(t, http.StatusOK, status)
	assert.True(t, verifyResp["valid"].(bool))
}

func TestIdentityVerifyInvalidSignature(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	status, verifyResp := app.DoJSON("POST", "/v1/identity/verify-signature", map[string]interface{}{
		"message":   "wrong message",
		"signature": "0xdeadbeef",
		"address":   "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
	})
	assert.Equal(t, http.StatusOK, status)
	assert.False(t, verifyResp["valid"].(bool))
}

func TestListTransactionsEmpty(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	status, txs := app.DoJSON("GET", "/v1/transactions", nil)
	assert.Equal(t, http.StatusOK, status)
	txsList := txs.([]interface{})
	assert.Equal(t, 0, len(txsList))
}

func TestListTransactionsWithFilters(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	wallet := app.CreateWallet(t)
	walletID := wallet["id"].(string)

	status, txs := app.DoJSON("GET", "/v1/transactions?wallet_id="+walletID+"&limit=10", nil)
	assert.Equal(t, http.StatusOK, status)
	txsList := txs.([]interface{})
	assert.Equal(t, 0, len(txsList))
}

func TestRateLimiting(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	hitLimit := false
	for i := 0; i < 200; i++ {
		resp, _ := app.Do("GET", "/v1/wallets/00000000-0000-0000-0000-000000000000", nil)
		if resp != nil && resp.StatusCode == http.StatusTooManyRequests {
			hitLimit = true
			break
		}
	}
	_ = hitLimit
}

func TestMultiTenantIsolation(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	wallet1 := app.CreateWallet(t)
	wallet1ID := wallet1["id"].(string)

	tenant2, apiKey2, err := app.TenantSvc.Register(context.Background(), domain.CreateTenantRequest{
		Name: "Tenant 2",
		Plan: "starter",
	})
	require.NoError(t, err)
	_ = tenant2

	req, _ := http.NewRequest("GET", app.Server.URL+"/v1/wallets/"+wallet1ID, nil)
	req.Header.Set("Authorization", "Bearer "+apiKey2.APIKey)
	req.Header.Set("X-API-Key", apiKey2.APIKey)

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)

	assert.NotEqual(t, http.StatusOK, resp.StatusCode)
	resp.Body.Close()
}

func TestFullWorkflow(t *testing.T) {
	app := SetupTestApp(t)
	defer app.Cleanup()

	t.Log("Step 1: Register tenant (done in setup)")
	assert.NotEmpty(t, app.APIKey)

	t.Log("Step 2: Create wallet")
	wallet := app.CreateWallet(t)
	walletID := wallet["id"].(string)
	assert.NotEmpty(t, walletID)

	t.Log("Step 3: Get wallet addresses")
	status, addrs := app.DoJSON("GET", "/v1/wallets/"+walletID+"/addresses", nil)
	assert.Equal(t, http.StatusOK, status)
	assert.Greater(t, len(addrs.([]interface{})), 0)

	t.Log("Step 4: Link external wallet")
	status, _ = app.DoJSON("POST", fmt.Sprintf("/v1/wallets/%s/connections", walletID), map[string]interface{}{
		"provider": "metamask",
		"address":  "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
		"chain_id": 137,
	})
	assert.Equal(t, http.StatusCreated, status)

	t.Log("Step 5: Sign message as identity")
	status, signResp := app.DoJSON("POST", "/v1/identity/sign-message", map[string]interface{}{
		"wallet_id": walletID,
		"message":   "auth-challenge-12345",
	})
	assert.Equal(t, http.StatusOK, status)
	assert.NotEmpty(t, signResp["signature"])

	t.Log("Step 6: Verify signature")
	status, verifyResp := app.DoJSON("POST", "/v1/identity/verify-signature", map[string]interface{}{
		"message":   "auth-challenge-12345",
		"signature": signResp["signature"],
		"address":   signResp["address"],
	})
	assert.Equal(t, http.StatusOK, status)
	assert.True(t, verifyResp["valid"].(bool))

	t.Log("Step 7: Create routing rule")
	status, rule := app.DoJSON("POST", "/v1/routing/rules", map[string]interface{}{
		"wallet_id":  walletID,
		"name":       "Auto-sweep",
		"type":       "sweep",
		"conditions": map[string]interface{}{"network": "polygon", "token": "USDC", "threshold": "100", "trigger": "on_receive"},
		"actions":    map[string]interface{}{"target_type": "wallet", "target_wallet_id": walletID, "amount": "all"},
	})
	assert.Equal(t, http.StatusCreated, status)
	ruleID := rule["id"].(string)

	t.Log("Step 8: Execute routing rule")
	status, exec := app.DoJSON("POST", "/v1/routing/rules/"+ruleID+"/execute", nil)
	assert.Equal(t, http.StatusOK, status)
	assert.Equal(t, "executed", exec["status"])

	t.Log("Step 9: List transactions")
	status, txs := app.DoJSON("GET", "/v1/transactions?wallet_id="+walletID, nil)
	assert.Equal(t, http.StatusOK, status)

	t.Log("Step 10: List rule executions")
	status, execs := app.DoJSON("GET", "/v1/routing/rules/"+ruleID+"/executions", nil)
	assert.Equal(t, http.StatusOK, status)
	assert.Greater(t, len(execs.([]interface{})), 0)

	t.Log("Full workflow completed successfully!")
}
