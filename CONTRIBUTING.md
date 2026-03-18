# Contributing to typesense-cli

Thanks for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/getclera/typesense-cli.git
cd typesense-cli
pnpm install
```

## Running Locally

```bash
# Set up environment
export TYPESENSE_HOST=localhost
export TYPESENSE_PORT=8108
export TYPESENSE_PROTOCOL=http
export TYPESENSE_ADMIN_KEY=xyz

# Run in development mode
pnpm dev collections list
```

## Code Style

- TypeScript strict mode
- No `any` types - use `unknown` with type guards
- Run `pnpm typecheck` before submitting

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run `pnpm typecheck` and `pnpm build`
5. Commit your changes (`git commit -m 'Add my feature'`)
6. Push to your fork (`git push origin feature/my-feature`)
7. Open a Pull Request

## Reporting Issues

Please include:
- Typesense server version
- CLI version (`typesense --version`)
- Node.js version
- Steps to reproduce
- Expected vs actual behavior
