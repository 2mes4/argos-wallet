package openwallet

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

type Config struct {
	APIKey  string
	BaseURL string
	HTTP    *http.Client
}

type Client struct {
	config       Config
	baseURL      *url.URL
	httpClient   *http.Client

	Wallets      *WalletResource
	Transactions *TransactionResource
	Routing      *RoutingResource
	Identity     *IdentityResource
}

func NewClient(cfg Config) (*Client, error) {
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://api.openwallet.dev"
	}

	baseURL, err := url.Parse(cfg.BaseURL)
	if err != nil {
		return nil, fmt.Errorf("invalid base URL: %w", err)
	}

	httpClient := cfg.HTTP
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 30 * time.Second}
	}

	c := &Client{
		config:     cfg,
		baseURL:    baseURL,
		httpClient: httpClient,
	}

	c.Wallets = &WalletResource{client: c}
	c.Transactions = &TransactionResource{client: c}
	c.Routing = &RoutingResource{client: c}
	c.Identity = &IdentityResource{client: c}

	return c, nil
}

func (c *Client) doRequest(method, path string, body interface{}) (*http.Response, error) {
	var bodyReader io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(jsonBody)
	}

	req, err := http.NewRequest(method, c.baseURL.String()+path, bodyReader)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.config.APIKey)
	req.Header.Set("X-API-Key", c.config.APIKey)
	req.Header.Set("User-Agent", "openwallet-sdk-go/0.1.0")

	return c.httpClient.Do(req)
}

func (c *Client) doJSON(method, path string, body interface{}, result interface{}) error {
	resp, err := c.doRequest(method, path, body)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode >= 400 {
		var errResp struct {
			Error string `json:"error"`
		}
		json.Unmarshal(respBody, &errResp)
		return &APIError{StatusCode: resp.StatusCode, Message: errResp.Error}
	}

	if result != nil {
		return json.Unmarshal(respBody, result)
	}

	return nil
}

type APIError struct {
	StatusCode int
	Message    string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("API error %d: %s", e.StatusCode, e.Message)
}
