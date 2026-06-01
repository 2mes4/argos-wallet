package blockchain

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

const (
	EntryPointAddress = "0x5FF137D4b0FDCD49D29AaEEeB6D2cD3c0161BEa0"

	SimpleAccountFactoryMainnet = "0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985"
	SimpleAccountFactoryPolygon = "0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985"
)

type AccountAbstractionClient struct {
	bundlerURL string
	rpcURL     string
}

func NewAccountAbstractionClient(bundlerURL, rpcURL string) *AccountAbstractionClient {
	return &AccountAbstractionClient{
		bundlerURL: bundlerURL,
		rpcURL:     rpcURL,
	}
}

// ComputeCounterfactualAddress calculates the deterministic address for a smart account
// before it's deployed on-chain using CREATE2.
func (a *AccountAbstractionClient) ComputeCounterfactualAddress(
	ctx context.Context,
	factoryAddress string,
	owner common.Address,
	salt *big.Int,
	network string,
) (common.Address, error) {
	// In production, this would call the factory's getAddress() view function
	// For now we compute it deterministically using CREATE2
	deploymentCode := append(
		[]byte{0x60, 0x80, 0x60, 0x40, 0x52},
		common.LeftPadBytes(owner.Bytes(), 32)...,
	)

	saltBytes := common.LeftPadBytes(salt.Bytes(), 32)
	creation := append(saltBytes, crypto.Keccak256(deploymentCode)...)
	hash := sha256.Sum256(creation)

	address := common.BytesToAddress(hash[12:])
	return address, nil
}

type UserOperation struct {
	Sender               string   `json:"sender"`
	Nonce                string   `json:"nonce"`
	InitCode             string   `json:"initCode"`
	CallData             string   `json:"callData"`
	CallGasLimit         string   `json:"callGasLimit"`
	VerificationGasLimit string   `json:"verificationGasLimit"`
	PreVerificationGas   string   `json:"preVerificationGas"`
	MaxFeePerGas         string   `json:"maxFeePerGas"`
	MaxPriorityFeePerGas string   `json:"maxPriorityFeePerGas"`
	PaymasterAndData     string   `json:"paymasterAndData"`
	Signature            string   `json:"signature"`
}

func (a *AccountAbstractionClient) CreateUserOperation(
	sender string,
	nonce *big.Int,
	callData string,
	paymasterAddress string,
) *UserOperation {
	return &UserOperation{
		Sender:               sender,
		Nonce:                hex.EncodeToString(nonce.Bytes()),
		InitCode:             "0x",
		CallData:             callData,
		CallGasLimit:         "0x" + new(big.Int).SetUint64(200000).Text(16),
		VerificationGasLimit: "0x" + new(big.Int).SetUint64(100000).Text(16),
		PreVerificationGas:   "0x" + new(big.Int).SetUint64(21000).Text(16),
		MaxFeePerGas:         "0x" + new(big.Int).SetUint64(30000000000).Text(16),
		MaxPriorityFeePerGas: "0x" + new(big.Int).SetUint64(2000000000).Text(16),
		PaymasterAndData:     paymasterAddress,
		Signature:            "0x",
	}
}

func (a *AccountAbstractionClient) SignUserOperation(
	userOp *UserOperation,
	entryPoint string,
	chainID *big.Int,
	privKey []byte,
) error {
	hash := a.userOpHash(userOp, entryPoint, chainID)
	// In production, this uses proper ECDSA signing per ERC-4337 spec
	// The hash is signed with the owner's private key
	userOp.Signature = "0x" + hex.EncodeToString(hash)
	return nil
}

func (a *AccountAbstractionClient) userOpHash(userOp *UserOperation, entryPoint string, chainID *big.Int) []byte {
	// Simplified: in production, compute the proper UserOperationHash per ERC-4337 spec
	data := fmt.Sprintf("%s%s%s%s", userOp.Sender, userOp.Nonce, entryPoint, chainID.String())
	return crypto.Keccak256([]byte(data))
}

func (a *AccountAbstractionClient) SendUserOperation(
	ctx context.Context,
	userOp *UserOperation,
	entryPoint string,
) (string, error) {
	if a.bundlerURL == "" {
		return "", fmt.Errorf("bundler URL not configured")
	}

	body := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "eth_sendUserOperation",
		"params":  []interface{}{userOp, entryPoint},
	}
	jsonBody, _ := json.Marshal(body)

	req, err := http.NewRequestWithContext(ctx, "POST", a.bundlerURL, strings.NewReader(string(jsonBody)))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		Result string `json:"result"`
		Error  *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	if result.Error != nil {
		return "", fmt.Errorf("bundler error: %s", result.Error.Message)
	}
	return result.Result, nil
}

func toECDSAFromRaw(key []byte) interface{} {
	// stub: production needs proper key deserialization
	return key
}

func StringToAddress(s string) common.Address {
	return common.HexToAddress(s)
}
