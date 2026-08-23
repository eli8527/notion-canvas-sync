# Contributing

Thanks for helping improve Notion Canvas Sync.

## Before opening an issue

- Search existing issues first.
- Remove student names, email addresses, IDs, access tokens, and workspace IDs from screenshots and logs.
- For security problems, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Development

1. Fork and clone the repository.
2. Use Node.js 22 or newer.
3. Install the locked dependencies with `npm ci`.
4. Copy `.env.example` to `.env` only if you need a local Canvas preview.
5. Make a focused change with tests.
6. Run `npm run check`, `npm test`, and `npm run build`.

Unit tests must not call a real Canvas instance. Use injected `fetch` implementations and synthetic records, as the existing tests do.

## Pull requests

Explain the behavior being changed, list the verification commands you ran, and call out any changes to the database schema, sync schedule, required permissions, or environment variables.
