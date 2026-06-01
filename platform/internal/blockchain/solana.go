package blockchain

import (
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/mr-tron/base58"
)

type SolanaClient struct {
	rpcURL string
}

func NewSolanaClient(rpcURL string) *SolanaClient {
	if rpcURL == "" {
		rpcURL = "https://api.mainnet-beta.solana.com"
	}
	return &SolanaClient{rpcURL: rpcURL}
}

func (s *SolanaClient) DeriveAddress(mnemonic string, walletSeed []byte) (string, []byte, error) {
	seed := sha256.Sum256(append([]byte(mnemonic), walletSeed...))
	privKey := ed25519.NewKeyFromSeed(seed[:32])
	pubKey := privKey.Public().(ed25519.PublicKey)
	address := base58.Encode(pubKey)
	return address, privKey, nil
}

func (s *SolanaClient) SignMessage(privKey []byte, message string) (string, error) {
	sig := ed25519.Sign(privKey, []byte(message))
	return base58.Encode(sig), nil
}

func (s *SolanaClient) VerifySignature(address, message, signature string) (bool, error) {
	pubKeyBytes, err := base58.Decode(address)
	if err != nil {
		return false, fmt.Errorf("decode address: %w", err)
	}
	sigBytes, err := base58.Decode(signature)
	if err != nil {
		return false, fmt.Errorf("decode signature: %w", err)
	}
	return ed25519.Verify(pubKeyBytes, []byte(message), sigBytes), nil
}

func (s *SolanaClient) GetBalance(ctx context.Context, address string) (uint64, error) {
	result, err := s.rpcCall(ctx, "getBalance", []interface{}{address})
	if err != nil {
		return 0, err
	}
	resultMap, ok := result.(map[string]interface{})
	if !ok {
		return 0, fmt.Errorf("unexpected balance response")
	}
	value, ok := resultMap["value"].(float64)
	if !ok {
		return 0, fmt.Errorf("unexpected balance value")
	}
	return uint64(value), nil
}

func (s *SolanaClient) SendTransaction(ctx context.Context, signedTx []byte) (string, error) {
	encoded := base58.Encode(signedTx)
	result, err := s.rpcCall(ctx, "sendTransaction", []interface{}{encoded, map[string]interface{}{
		"encoding": "base58",
	}})
	if err != nil {
		return "", err
	}
	txHash, ok := result.(string)
	if !ok {
		return "", fmt.Errorf("unexpected tx response")
	}
	return txHash, nil
}

func (s *SolanaClient) rpcCall(ctx context.Context, method string, params []interface{}) (interface{}, error) {
	body := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  method,
		"params":  params,
	}
	jsonBody, _ := json.Marshal(body)

	req, err := http.NewRequestWithContext(ctx, "POST", s.rpcURL, strings.NewReader(string(jsonBody)))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Result interface{} `json:"result"`
		Error  *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	if result.Error != nil {
		return nil, fmt.Errorf("rpc error: %s", result.Error.Message)
	}
	return result.Result, nil
}

func init() {
	_ = base58.Encode
}
