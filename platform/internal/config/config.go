package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Vault    VaultConfig
	Firebase FirebaseConfig
	Blockchain BlockchainConfig
	Worker   WorkerConfig
	LogLevel string
}

type ServerConfig struct {
	Port         int
	AllowOrigins []string
	ReadTimeout  int
	WriteTimeout int
}

type DatabaseConfig struct {
	URL             string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime int
}

type VaultConfig struct {
	Address string
	Token   string
}

type FirebaseConfig struct {
	ProjectID string
	Config    string
}

type BlockchainConfig struct {
	MnemonicSeedID string
	DefaultNetworks []string
	RPCURLs        map[string]string
}

type WorkerConfig struct {
	TXPollIntervalMs   int
	TXPollMaxAttempts  int
	RuleEvalIntervalMs int
	BalanceSyncIntervalMs int
	SweepIntervalMs       int
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port:         getEnvInt("SERVER_PORT", 8080),
			AllowOrigins: getEnvSlice("ALLOW_ORIGINS", []string{"http://localhost:3000", "http://localhost:3001", "*"}),
			ReadTimeout:  getEnvInt("READ_TIMEOUT", 30),
			WriteTimeout: getEnvInt("WRITE_TIMEOUT", 30),
		},
		Database: DatabaseConfig{
			URL:             getEnv("DATABASE_URL", "postgres://postgres:dev@localhost:5432/argos?sslmode=disable"),
			MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 5),
			ConnMaxLifetime: getEnvInt("DB_CONN_MAX_LIFETIME", 300),
		},
		Vault: VaultConfig{
			Address: getEnv("VAULT_ADDR", "http://localhost:8200"),
			Token:   getEnv("VAULT_TOKEN", "dev-root"),
		},
		Firebase: FirebaseConfig{
			ProjectID: getEnv("FIREBASE_PROJECT_ID", ""),
			Config:    getEnv("FIREBASE_CONFIG", ""),
		},
		Blockchain: BlockchainConfig{
			MnemonicSeedID:  getEnv("VAULT_MNEMONIC_PATH", "secret/data/argoswallet/mnemonic"),
			DefaultNetworks: getEnvSlice("DEFAULT_NETWORKS", []string{"polygon", "ethereum", "base"}),
			RPCURLs: map[string]string{
				"polygon":         getEnv("RPC_POLYGON", "https://polygon-rpc.com"),
				"polygon-amoy":    getEnv("RPC_POLYGON_AMOY", "https://rpc-amoy.polygon.technology"),
				"ethereum":        getEnv("RPC_ETHEREUM", "https://eth.llamarpc.com"),
				"ethereum-sepolia": getEnv("RPC_ETHEREUM_SEPOLIA", "https://rpc.sepolia.org"),
				"base":            getEnv("RPC_BASE", "https://mainnet.base.org"),
				"base-sepolia":    getEnv("RPC_BASE_SEPOLIA", "https://sepolia.base.org"),
			},
		},
		Worker: WorkerConfig{
			TXPollIntervalMs:      getEnvInt("TX_POLL_INTERVAL_MS", 5000),
			TXPollMaxAttempts:     getEnvInt("TX_POLL_MAX_ATTEMPTS", 60),
			RuleEvalIntervalMs:    getEnvInt("RULE_EVAL_INTERVAL_MS", 10000),
			BalanceSyncIntervalMs: getEnvInt("BALANCE_SYNC_INTERVAL_MS", 30000),
			SweepIntervalMs:       getEnvInt("SWEEP_INTERVAL_MS", 60000),
		},
		LogLevel: getEnv("LOG_LEVEL", "info"),
	}
}

func (c *Config) DSN() string {
	return c.Database.URL
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}

func getEnvSlice(key string, fallback []string) []string {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	result := []string{}
	for _, s := range splitComma(v) {
		s = trimSpace(s)
		if s != "" {
			result = append(result, s)
		}
	}
	if len(result) == 0 {
		return fallback
	}
	return result
}

func splitComma(s string) []string {
	result := []string{}
	current := ""
	for _, c := range s {
		if c == ',' {
			result = append(result, current)
			current = ""
		} else {
			current += string(c)
		}
	}
	result = append(result, current)
	return result
}

func trimSpace(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}
	return s[start:end]
}

func (c *Config) Validate() error {
	if c.Database.URL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	if c.Vault.Address == "" {
		return fmt.Errorf("VAULT_ADDR is required")
	}
	return nil
}
