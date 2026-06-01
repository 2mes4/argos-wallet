.PHONY: help build test lint clean deploy migrate

ROOT_DIR := $(shell pwd)

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

# ─── Platform (Go) ──────────────────────────────────────────────────

platform.build: ## Build Go platform Docker images
	cd platform && docker build -t ericmora/argos-wallet:latest .

platform.test: ## Run Go platform tests
	cd platform && go test ./... -v -count=1

platform.lint: ## Lint Go platform
	cd platform && golangci-lint run ./...

platform.run: ## Run platform locally via docker-compose
	docker-compose up -d

platform.stop: ## Stop local platform
	docker-compose down

platform.migrate: ## Run database migrations
	cd platform && RUN_MIGRATIONS=true go run ./cmd/server

# ─── Go SDK ─────────────────────────────────────────────────────────

sdk-go.test: ## Test Go SDK
	cd sdks/go && go test ./... -v

sdk-go.lint: ## Lint Go SDK
	cd sdks/go && golangci-lint run ./...

sdk-go.build: ## Build Go SDK example
	cd sdks/go && go build ./...

# ─── TypeScript SDK ─────────────────────────────────────────────────

sdk-ts.install: ## Install TypeScript SDK dependencies
	cd sdks/typescript && npm install

sdk-ts.build: ## Build TypeScript SDK
	cd sdks/typescript && npx turbo build

sdk-ts.test: ## Test TypeScript SDK
	cd sdks/typescript && npx turbo test

sdk-ts.lint: ## Lint TypeScript SDK
	cd sdks/typescript && npx turbo lint

# ─── Dart SDK ───────────────────────────────────────────────────────

sdk-dart.test: ## Test Dart SDK
	cd sdks/dart && dart test

sdk-dart.analyze: ## Analyze Dart SDK
	cd sdks/dart && dart analyze

sdk-dart.build: ## Build Dart SDK
	cd sdks/dart && dart pub get

# ─── Integration Tests ─────────────────────────────────────────────

integration.test: ## Run integration tests
	cd platform && go test ../tests/integration/... -v -count=1 -tags=integration

test-all: platform.test sdk-go.test sdk-ts.test sdk-dart.test integration.test ## Run all tests

# ─── Infrastructure ────────────────────────────────────────────────

deploy.staging: ## Deploy to staging K3s
	./infra/scripts/deploy.sh staging

deploy.production: ## Deploy to production K3s
	./infra/scripts/deploy.sh production

firebase.deploy: ## Deploy Firebase rules and indexes
	cd infra/firebase && firebase deploy --only firestore:rules,firestore:indexes

tenant.create: ## Create a new tenant
	./infra/scripts/create-tenant.sh

# ─── Docker ─────────────────────────────────────────────────────────

docker.up: ## Start all services via docker-compose
	docker-compose up -d --build

docker.down: ## Stop all services
	docker-compose down

docker.logs: ## Show logs
	docker-compose logs -f

docker.ps: ## List running services
	docker-compose ps

# ─── Misc ───────────────────────────────────────────────────────────

clean: ## Clean all build artifacts
	cd platform && find . -type f -name '*.generated.go' -delete
	rm -rf sdks/typescript/packages/*/dist
	rm -rf sdks/typescript/**/node_modules
	cd sdks/dart && dart pub cache clean

lint: platform.lint sdk-go.lint sdk-ts.lint sdk-dart.analyze ## Lint everything
