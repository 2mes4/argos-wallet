# Contributing to Argos Wallet

Thank you for your interest in contributing! Argos is an open-source project and we welcome contributions of all kinds.

## Quick Start

```bash
# Clone
git clone git@github.com:2mes4/argos-wallet.git
cd argos-wallet

# Backend
cd platform
go run ./cmd/server

# Frontend (separate terminal)
cd web
npm install && npm run dev

# Run tests
cd platform
go test ./tests/integration/ -v
```

## How to Contribute

### Bug Reports

1. Search existing [issues](https://github.com/2mes4/argos-wallet/issues) first
2. Open a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment (OS, Go version, PostgreSQL version)

### Feature Requests

1. Open an issue with the `enhancement` label
2. Describe the use case, not just the solution
3. If possible, sketch the API or UI changes

### Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your changes following our code style
3. Add or update tests
4. Ensure all tests pass: `go test ./tests/integration/ -v`
5. Write clear commit messages
6. Open a PR targeting `main`

### Code Style

**Go:**
- Follow `gofmt` / `goimports`
- Use `zerolog` for logging
- Wrap errors with context: `fmt.Errorf("operation failed: %w", err)`

**TypeScript / React:**
- Use TypeScript strict mode
- Follow existing Tailwind class patterns
- Use `lucide-react` for icons
- Use `framer-motion` for animations

### Areas We Need Help

- Non-EVM chain support (Solana, Bitcoin, NEAR)
- Additional SDKs (Python, Ruby, Rust)
- Dashboard analytics and charts
- Documentation translations
- Test coverage improvements

## License

By contributing, you agree that your contributions will be licensed under the [Business Source License 1.1](LICENSE).

## Questions?

- Open an [issue](https://github.com/2mes4/argos-wallet/issues)
- Contact: eric@2mes4.com
