# Canton LocalNet setup

Use this to run the Canton MCP tools (configure, balance, transfer, etc.) against a local Canton network instead of DevNet. The same environment variables apply whether you use **Claude Code**, **Cursor**, or any other MCP client; only where you set them differs.

## 1. Set environment for the MCP server

The MCP server must see `CANTON_USE_LOCALNET=true` when it starts (and optionally `CANTON_VALIDATOR_URL`, `CANTON_LEDGER_API_URL`). How you pass `env` depends on how you run the server:

### Option A: MCP client config file

Add an `env` block to the `clawd-wallet` server entry in your client’s config. The config file location depends on the client:

| Client       | Config file(s) |
|-------------|----------------|
| **Claude Code** | `~/.claude.json` |
| **Cursor**      | `~/.cursor/mcp.json` or project `.cursor/mcp.json` |

Example (use your real path to `dist/mcp-server/index.js`):

```json
{
  "mcpServers": {
    "clawd-wallet": {
      "command": "node",
      "args": ["/absolute/path/to/unified-clawd-wallet-mcp/dist/mcp-server/index.js"],
      "env": {
        "CANTON_USE_LOCALNET": "true",
        "CANTON_VALIDATOR_URL": "http://127.0.0.1:2903/api/validator"
      }
    }
  }
}
```

Restart your MCP client after changing config so the server starts with the new env.

### Option B: Cursor project-only config (this repo)

If you use **Cursor** and open this repo as the workspace, `.cursor/mcp.json` in this project may already set `CANTON_USE_LOCALNET=true`. Ensure Cursor is using this project’s MCP config (this folder as workspace).

### Option C: Run the server yourself (any MCP client)

Start the server with env vars set; then connect your MCP client to it (e.g. stdio, or the client’s “custom server” option):

```bash
cd /path/to/unified-clawd-wallet-mcp
export CANTON_USE_LOCALNET=true
export CANTON_VALIDATOR_URL=http://127.0.0.1:2903/api/validator
npm run build
node dist/mcp-server/index.js
```

Then point your MCP client (Claude Code, Cursor, or another) at this process. No client-specific config file is needed for Canton; the server reads the env from the shell.

---

## 2. Start Canton LocalNet

The MCP server expects:

- **Ledger API**: `http://127.0.0.1:2975` (App User JSON API, port suffix 975)
- **Validator API base**: `http://127.0.0.1:2903/api/validator` (App User validator, port 2903)

### Splice LocalNet (recommended)

1. Download and extract the Splice node bundle:
   - https://github.com/digital-asset/decentralized-canton-sync/releases (e.g. `0.5.11_splice-node.tar.gz`)
   ```bash
   tar xzvf 0.5.11_splice-node.tar.gz
   ```

2. Set env and start:
   ```bash
   export LOCALNET_DIR=$PWD/splice-node/docker-compose/localnet
   export IMAGE_TAG=0.5.11

   docker compose --env-file $LOCALNET_DIR/compose.env \
     --env-file $LOCALNET_DIR/env/common.env \
     -f $LOCALNET_DIR/compose.yaml \
     -f $LOCALNET_DIR/resource-constraints.yaml \
     --profile sv --profile app-provider --profile app-user up -d
   ```

3. If your setup uses different ports, set:
   ```bash
   export CANTON_LEDGER_API_URL=http://127.0.0.1:YOUR_LEDGER_PORT
   export CANTON_VALIDATOR_URL=http://127.0.0.1:YOUR_VALIDATOR_PORT
   ```
   Splice App User: ledger 2975; validator: **http://127.0.0.1:2903/api/validator**.
   If you use different ports, set `CANTON_LEDGER_API_URL` and `CANTON_VALIDATOR_URL` in the MCP server’s `env` (in your client config or when running the server yourself).

Full details: [Splice LocalNet docs](https://docs.dev.global.canton.network.sync.global/app_dev/testing/localnet.html).

### If you see “The requested resource could not be found” on the validator

- The default validator URL is `http://127.0.0.1:2903/api/validator`. Override with `CANTON_VALIDATOR_URL` in the server’s environment (client config or shell) if your setup uses a different base URL.

---

## 3. Create a party and use the tools

1. Restart your MCP client (or the server process) so the server sees `CANTON_USE_LOCALNET=true` and any custom URLs.
2. In your MCP client (Claude Code, Cursor, etc.), call **canton_configure** with `displayName: "test-wallet"` (no `partyId`) to create a new party.
3. Then use **canton_check_balance**, **canton_list_holdings**, **canton_transfer**, **canton_transaction_history** as needed.

If you see “fetch failed” or connection errors, the server is likely not using LocalNet or LocalNet is not running. Ensure:
- `CANTON_USE_LOCALNET=true` is in the MCP server’s environment.
- LocalNet is up and the ledger (2975) and validator (http://127.0.0.1:2903/api/validator, or your CANTON_VALIDATOR_URL) are reachable from the machine running the MCP server.
