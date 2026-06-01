package vault

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

type Client struct {
	addr  string
	token string
	http  *http.Client
}

func NewClient(addr, token string) *Client {
	return &Client{
		addr:  strings.TrimRight(addr, "/"),
		token: token,
		http:  http.DefaultClient,
	}
}

func (c *Client) GetSecret(ctx context.Context, path string) (map[string]interface{}, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", c.addr+"/v1/"+path, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Vault-Token", c.token)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("vault request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("vault %d: %s", resp.StatusCode, body)
	}

	var result struct {
		Data struct {
			Data map[string]interface{} `json:"data"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result.Data.Data, nil
}

func (c *Client) PutSecret(ctx context.Context, path string, data map[string]interface{}) error {
	body := map[string]interface{}{"data": data}
	jsonBody, _ := json.Marshal(body)

	req, err := http.NewRequestWithContext(ctx, "POST", c.addr+"/v1/"+path, strings.NewReader(string(jsonBody)))
	if err != nil {
		return err
	}
	req.Header.Set("X-Vault-Token", c.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("vault put: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("vault put %d: %s", resp.StatusCode, body)
	}
	return nil
}

// GetMnemonic retrieves the HD wallet mnemonic from Vault
func (c *Client) GetMnemonic(ctx context.Context, path string) (string, error) {
	data, err := c.GetSecret(ctx, path)
	if err != nil {
		return "", err
	}
	mnemonic, ok := data["mnemonic"].(string)
	if !ok {
		return "", fmt.Errorf("mnemonic not found in vault secret")
	}
	return mnemonic, nil
}

// StoreMnemonic stores the HD wallet mnemonic in Vault
func (c *Client) StoreMnemonic(ctx context.Context, path, mnemonic string) error {
	return c.PutSecret(ctx, path, map[string]interface{}{"mnemonic": mnemonic})
}
