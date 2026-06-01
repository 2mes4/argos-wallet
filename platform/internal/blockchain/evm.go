package blockchain

import (
	"context"
	"crypto/ecdsa"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
	"strconv"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/google/uuid"
)

type EVMClient struct {
	rpcURLs  map[string]string
	mnemonic string
}

func NewEVMClient(rpcURLs map[string]string, mnemonic string) *EVMClient {
	return &EVMClient{rpcURLs: rpcURLs, mnemonic: mnemonic}
}

func (c *EVMClient) Dial(ctx context.Context, network string) (*ethclient.Client, error) {
	rpcURL, ok := c.rpcURLs[network]
	if !ok {
		return nil, fmt.Errorf("no RPC URL for network %s", network)
	}
	return ethclient.DialContext(ctx, rpcURL)
}

func (c *EVMClient) DerivePrivateKey(walletID uuid.UUID) (*ecdsa.PrivateKey, error) {
	seed := sha256.Sum256([]byte(c.mnemonic + walletID.String()))
	privKey, err := crypto.ToECDSA(seed[:])
	if err != nil {
		return nil, fmt.Errorf("derive key: %w", err)
	}
	return privKey, nil
}

func (c *EVMClient) DeriveAddress(walletID uuid.UUID) (string, *ecdsa.PrivateKey, error) {
	privKey, err := c.DerivePrivateKey(walletID)
	if err != nil {
		return "", nil, err
	}
	publicKey := privKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return "", nil, fmt.Errorf("casting public key to ECDSA")
	}
	address := crypto.PubkeyToAddress(*publicKeyECDSA).Hex()
	return address, privKey, nil
}

func (c *EVMClient) GetBalance(ctx context.Context, network, address string) (*big.Int, error) {
	client, err := c.Dial(ctx, network)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	return client.BalanceAt(ctx, common.HexToAddress(address), nil)
}

func (c *EVMClient) GetERC20Balance(ctx context.Context, network, tokenAddr, walletAddr string) (*big.Int, error) {
	client, err := c.Dial(ctx, network)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	erc20, err := NewERC20Caller(common.HexToAddress(tokenAddr), client)
	if err != nil {
		return nil, err
	}

	return erc20.BalanceOf(&bind.CallOpts{}, common.HexToAddress(walletAddr))
}

func (c *EVMClient) TransferNative(ctx context.Context, network string, privKey *ecdsa.PrivateKey, to string, amount *big.Int) (string, error) {
	client, err := c.Dial(ctx, network)
	if err != nil {
		return "", err
	}
	defer client.Close()

	chainID, err := client.ChainID(ctx)
	if err != nil {
		return "", err
	}

	publicKey := privKey.Public()
	publicKeyECDSA := publicKey.(*ecdsa.PublicKey)
	fromAddr := crypto.PubkeyToAddress(*publicKeyECDSA)

	nonce, err := client.PendingNonceAt(ctx, fromAddr)
	if err != nil {
		return "", err
	}

	gasPrice, err := client.SuggestGasPrice(ctx)
	if err != nil {
		return "", err
	}

	toAddr := common.HexToAddress(to)
	gasLimit := uint64(21000)

	tx := types.NewTx(&types.LegacyTx{
		Nonce:    nonce,
		To:       &toAddr,
		Value:    amount,
		Gas:      gasLimit,
		GasPrice: gasPrice,
	})

	signer := types.NewEIP155Signer(chainID)
	signedTx, err := types.SignTx(tx, signer, privKey)
	if err != nil {
		return "", err
	}

	if err := client.SendTransaction(ctx, signedTx); err != nil {
		return "", err
	}

	return signedTx.Hash().Hex(), nil
}

func (c *EVMClient) SignMessage(privKey *ecdsa.PrivateKey, message string) (string, error) {
	fullMessage := fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(message), message)
	hash := crypto.Keccak256Hash([]byte(fullMessage))
	signature, err := crypto.Sign(hash.Bytes(), privKey)
	if err != nil {
		return "", err
	}
	signature[64] += 27
	return hex.EncodeToString(signature), nil
}

func (c *EVMClient) VerifySignature(address, message, signature string) (bool, error) {
	sigBytes, err := hex.DecodeString(strings.TrimPrefix(signature, "0x"))
	if err != nil {
		return false, err
	}
	if len(sigBytes) < 65 {
		return false, fmt.Errorf("invalid signature length")
	}
	sigBytes[64] -= 27

	fullMessage := fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(message), message)
	hash := crypto.Keccak256Hash([]byte(fullMessage))

	recoveredPub, err := crypto.SigToPub(hash.Bytes(), sigBytes)
	if err != nil {
		return false, err
	}

	recoveredAddr := crypto.PubkeyToAddress(*recoveredPub).Hex()
	return strings.EqualFold(recoveredAddr, address), nil
}

func (c *EVMClient) ToTokenAmount(amount string, decimals int) (*big.Int, error) {
	parts := strings.Split(amount, ".")
	whole := parts[0]
	var fraction string
	if len(parts) > 1 {
		fraction = parts[1]
		if len(fraction) > decimals {
			fraction = fraction[:decimals]
		}
		for len(fraction) < decimals {
			fraction += "0"
		}
	} else {
		fraction = strings.Repeat("0", decimals)
	}

	wholeInt := new(big.Int)
	wholeInt.SetString(whole, 10)

	multiplier := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(decimals)), nil)
	wholeInt.Mul(wholeInt, multiplier)

	fracInt := new(big.Int)
	if fraction != "" {
		fracInt.SetString(fraction, 10)
	}

	return wholeInt.Add(wholeInt, fracInt), nil
}

func (c *EVMClient) TokenAmountToDecimal(amount *big.Int, decimals int) string {
	divisor := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(decimals)), nil)
	whole := new(big.Int).Div(amount, divisor)
	remainder := new(big.Int).Mod(amount, divisor)

	if remainder.Sign() == 0 {
		return whole.String()
	}

	fracStr := fmt.Sprintf("%0*s", decimals, remainder.String())
	fracStr = strings.TrimRight(fracStr, "0")

	return whole.String() + "." + fracStr
}

func ParseChainID(s string) (int, error) {
	return strconv.Atoi(s)
}
