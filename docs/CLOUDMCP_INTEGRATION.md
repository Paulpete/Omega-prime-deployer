CloudMCP.run Integration Notes

Overview
- CloudMCP.run is a planned one-click service to host MCP servers in the cloud and provide zero-setup MCP server instances to VS Code users.
- Integration goals: allow the extension to discover, launch, and connect to CloudMCP-hosted MCP servers using OAuth 2.1 for authentication and a short-lived API token.

Authentication
- Use OAuth 2.1 authorization code flow with PKCE for user sign-in.
- Store only ephemeral access tokens in the extension runtime and refresh only via refresh tokens that are stored securely by the OS (or rely on the browser session).

API surface (high level)
- `POST /api/v1/instances` — create an MCP server instance. Returns: instance id, connection info, and a short-lived API token.
- `GET /api/v1/instances/:id/status` — poll instance health until ready.
- `DELETE /api/v1/instances/:id` — tear down the instance when user stops it.

Security & telemetry
- Do not log tokens or user identifiers in plain text. Use telemetry to track success/failure states but never include secrets.
- Provide UI dialog to ask users before creating cloud instances; show pricing/tokens usage if applicable.

VS Code UX considerations
- Provide a one-click "Launch in CloudMCP" button next to any MCP server listing in the extension's Webview.
- Open a preview Webview panel that shows creation progress and a "Connect" button once the instance is ready.

Implementation roadmap
1. Implement OAuth 2.1 flow in extension backend via the vscode authentication API and a CloudMCP provider registration.
2. Implement `cloudCreateInstance()` wrapper that calls CloudMCP APIs and returns connection string.
3. Add confirm dialogs and telemetry opt-in.
4. Add billing/pricing display and instance lifecycle management UI.

Notes
- This file is informational; no runtime code is included. For an actual integration we'll need client credentials and a CloudMCP sandbox account.
