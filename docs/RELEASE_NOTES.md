# Omega Prime Deployer — Release Notes (MCP Installer Preview)

Date: 2025-09-14

This release introduces a preview of an intelligent MCP server installer for the VS Code extension. It provides a skeleton for detecting the best installation method and offers placeholders for NPX/UVX/Docker installation flows, CloudMCP.run one-click deployment integration, and AI-driven retry/error-recovery helpers.

Highlights
- Smart install detection (NPX, UVX, Docker) — chooses the best available installer for a given MCP server.
- Retry/backoff with configurable attempts and backoff strategy.
- CloudMCP.run placeholder integration for one-click cloud-hosted MCP server launches.
- Safe, minimal TypeScript implementation with clear extension wiring points.

What's included in the preview
- `src/mcpInstaller.ts` — a lightweight, dependency-free TypeScript module that detects system capabilities, chooses an installer, and exposes install/verify API.
- `docs/CLOUDMCP_INTEGRATION.md` — notes on CloudMCP.run integration and required OAuth/telemetry considerations.

Migration & usage notes
- This is a preview: the module is intentionally decoupled from the extension activation flow so you can review and iterate.
- The installer uses shell commands (via `child_process`) when performing local installs — be sure to review and sandbox if you run installs on developer machines.

Security
- The installer does not ship or manage secrets. CloudMCP.run integration should use OAuth 2.1 and short-lived tokens; see `docs/CLOUDMCP_INTEGRATION.md`.

Next steps
- Wire `src/mcpInstaller.ts` into the extension activation lifecycle and the Webview UI.
- Add tests and end-to-end staging with CloudMCP.run preview accounts.
- Expand NPX/UVX/Docker adapters with server-specific install commands.

Feedback
- If you'd like, I can push a follow-up implementing a specific NPX adapter for the Postgres MCP server you looked up earlier, and a small smoke-test harness to verify installs in a dev container.
