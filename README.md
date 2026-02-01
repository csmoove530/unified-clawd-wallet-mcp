# CLAWD Wallet

**C**laude's **L**ightweight **A**utonomous **W**allet for **D**evelopers

A unified MCP server providing x402 payments, TAP identity verification, and domain registration for Claude Code and other MCP clients.

## Features

### x402 Payments (5 tools)
- `x402_payment_request` - Make payments to x402-enabled services
- `x402_check_balance` - Check USDC balance on Base
- `x402_get_address` - Get wallet address for funding
- `x402_transaction_history` - View payment history
- `x402_discover_services` - Find x402 services

### TAP Identity (4 tools)
- `tap_register_agent` - Register with TAP registry
- `tap_verify_identity` - Complete KYC/KYB verification
- `tap_get_status` - Check verification status
- `tap_revoke` - Remove credentials

### Domain Registration (9 tools)
- `clawd_domain_search` - Search available domains
- `clawd_domain_purchase` - Initiate domain purchase
- `clawd_domain_confirm` - Confirm after payment
- `clawd_domain_list` - List owned domains
- `clawd_dns_list` - List DNS records
- `clawd_dns_create` - Create DNS record
- `clawd_dns_delete` - Delete DNS record
- `clawd_domain_nameservers` - Update nameservers
- `clawd_domain_auth_code` - Get transfer auth code

## Installation

```bash
cd ~/clawd-wallet
npm install
npm run build
```

## Configuration

### MCP Server (Claude Code)

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "clawd-wallet": {
      "command": "node",
      "args": ["/path/to/clawd-wallet/dist/mcp-server/index.js"],
      "env": {
        "CLAWD_BACKEND_URL": "http://localhost:8402"
      }
    }
  }
}
```

### Environment Variables

**MCP Server:**
```bash
CLAWD_BACKEND_URL=http://localhost:8402  # Domain backend URL
CLAWD_TAP_REGISTRY=https://tap-registry.visa.com/v1  # TAP registry
```

**Backend (for domain registration):**
```bash
PORKBUN_API_KEY=pk1_...     # Porkbun API key
PORKBUN_SECRET=sk1_...      # Porkbun secret
TREASURY_ADDRESS=0x...       # Wallet for USDC payments
PUBLIC_URL=https://...       # Public URL for callbacks
```

## Backend Deployment

The domain registration backend can be deployed to Railway:

```bash
cd backend
railway up
```

Or run locally:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --host 0.0.0.0 --port 8402 --reload
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Claude Code / MCP Client                                   │
└─────────────────────────┬───────────────────────────────────┘
                          │ MCP Protocol
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  CLAWD Wallet MCP Server (18 tools)                         │
│  ├─ Wallet (x402 payments)                                  │
│  ├─ TAP (identity verification)                             │
│  └─ Domains (registration & DNS)                            │
└──────────┬──────────────────────┬───────────────────────────┘
           │                      │
           │ x402 Protocol        │ HTTP API
           ▼                      ▼
┌──────────────────┐    ┌────────────────────┐
│  x402 Services   │    │  Domain Backend    │
│  (pay-per-use)   │    │  (FastAPI/Python)  │
└──────────────────┘    └─────────┬──────────┘
                                  │
                                  ▼
                        ┌────────────────────┐
                        │  Porkbun API       │
                        │  (domain registrar)│
                        └────────────────────┘
```

## Usage Examples

### Purchase a Domain

```
User: "Search for domains with 'myproject'"

Claude: [calls clawd_domain_search]
Found: myproject.dev ($14.99), myproject.xyz ($4.99)

User: "Buy myproject.xyz for 1 year"

Claude: [calls clawd_domain_purchase]
[calls x402_payment_request]
[calls clawd_domain_confirm]

Domain registered! Configure DNS with clawd_dns_create.
```

### Verify Identity for Premium Services

```
User: "Verify my identity for premium merchants"

Claude: [calls tap_verify_identity with level="kyc"]

Identity verified at KYC level.
Reputation score: 50.0
Premium merchants will now accept your payments.
```

## Security

- Private keys stored in OS keychain (macOS Keychain, Windows Credential Manager, Linux libsecret)
- Spend limits enforced per-transaction and daily
- TAP credentials stored with 0600 permissions
- All payments require explicit user approval in Claude Code

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Run MCP server directly
node dist/mcp-server/index.js
```

## License

Apache-2.0
