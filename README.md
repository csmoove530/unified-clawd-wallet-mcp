# CLAWD Wallet

**C**laude's **L**ightweight **A**utonomous **W**allet for **D**evelopers

A unified MCP server providing x402 payments, TAP identity verification, referral onboarding, and domain registration for Claude Code and other MCP clients.

## Quick Start (5 minutes)

### 1. Install

```bash
git clone https://github.com/csmoove530/unified-clawd-wallet-mcp.git
cd unified-clawd-wallet-mcp
npm install && npm run build
```

### 2. Add to Claude Code

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "clawd-wallet": {
      "command": "node",
      "args": ["/path/to/unified-clawd-wallet-mcp/dist/mcp-server/index.js"],
      "env": {
        "CLAWD_BACKEND_URL": "https://clawd-domain-backend-production.up.railway.app",
        "CLAWD_TAP_MOCK_MODE": "true"
      }
    }
  }
}
```

### 3. Restart Claude Code and Try It

```
You: "Check my wallet balance"

Claude: [calls x402_check_balance]

{
  "success": true,
  "balance": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f...",
    "amount": "25.50",
    "currency": "USDC",
    "decimals": 6
  }
}
```

You now have a working CLAWD Wallet.

---

## What Can You Do?

### Check Your Balance

```
You: "What's my USDC balance?"
```

Returns:
```json
{
  "success": true,
  "balance": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f...",
    "amount": "25.50",
    "currency": "USDC",
    "decimals": 6
  }
}
```

### Redeem a Referral Code (New Users)

```
You: "Redeem referral code CLAWD2024"
```

Returns:
```json
{
  "success": true,
  "code": "CLAWD2024",
  "amount": 15,
  "currency": "USDC",
  "txHash": "0x1234...abcd",
  "recipientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f...",
  "explorerUrl": "https://basescan.org/tx/0x1234...abcd",
  "message": "Successfully redeemed $15 USDC! Check your balance with x402_check_balance."
}
```

### Search for a Domain

```
You: "Search for domains with 'myproject'"
```

Returns:
```json
{
  "query": "myproject",
  "results": [
    { "domain": "myproject.dev", "available": true, "first_year_price_usdc": "14.99" },
    { "domain": "myproject.xyz", "available": true, "first_year_price_usdc": "4.99" },
    { "domain": "myproject.com", "available": false }
  ]
}
```

### Purchase a Domain

```
You: "Buy myproject.xyz for John Doe, john@example.com"
```

Claude will:
1. Call `clawd_domain_purchase` → Get payment details
2. Call `x402_payment_request` → Execute USDC payment
3. Call `clawd_domain_confirm` → Register the domain

Returns:
```json
{
  "success": true,
  "domain": "myproject.xyz",
  "status": "registered",
  "expires": "2027-02-01",
  "nameservers": ["ns1.porkbun.com", "ns2.porkbun.com"]
}
```

### Verify Your Identity (TAP)

```
You: "Verify my identity for premium merchants"
```

Returns:
```json
{
  "success": true,
  "status": "verified",
  "agentId": "agent_abc123",
  "identityLevel": "kyc",
  "reputationScore": 50.0,
  "message": "Identity verified at KYC level. Premium merchants will now accept your payments."
}
```

---

## All 19 Tools

### Wallet Tools (5)

| Tool | Description | Example |
|------|-------------|---------|
| `x402_payment_request` | Pay an x402-enabled service | `"Pay $0.01 to https://api.example.com/data"` |
| `x402_check_balance` | Check USDC balance on Base | `"What's my balance?"` |
| `x402_get_address` | Get wallet address for funding | `"What's my wallet address?"` |
| `x402_transaction_history` | View recent payments | `"Show my last 5 transactions"` |
| `x402_discover_services` | Find x402 services | `"Find AI services I can pay for"` |

### Referral Tools (1)

| Tool | Description | Example |
|------|-------------|---------|
| `x402_redeem_referral` | Redeem code for free USDC | `"Redeem referral code CLAWD2024"` |

### TAP Identity Tools (4)

| Tool | Description | Example |
|------|-------------|---------|
| `tap_register_agent` | Register with TAP registry | `"Register my agent as 'My AI Assistant'"` |
| `tap_verify_identity` | Complete KYC/KYB verification | `"Verify my identity at KYC level"` |
| `tap_get_status` | Check verification status | `"What's my TAP status?"` |
| `tap_revoke` | Remove TAP credentials | `"Remove my TAP verification"` |

### Domain Tools (9)

| Tool | Description | Example |
|------|-------------|---------|
| `clawd_domain_search` | Search available domains | `"Search for domains with 'myapp'"` |
| `clawd_domain_purchase` | Start domain purchase | `"Buy myapp.dev for John Doe"` |
| `clawd_domain_confirm` | Confirm after payment | (automatic after payment) |
| `clawd_domain_list` | List your domains | `"Show my domains"` |
| `clawd_dns_list` | List DNS records | `"Show DNS records for myapp.dev"` |
| `clawd_dns_create` | Create DNS record | `"Point myapp.dev to 192.0.2.1"` |
| `clawd_dns_delete` | Delete DNS record | `"Delete the A record for myapp.dev"` |
| `clawd_domain_nameservers` | Update nameservers | `"Use Cloudflare nameservers for myapp.dev"` |
| `clawd_domain_auth_code` | Get transfer auth code | `"Get auth code to transfer myapp.dev"` |

---

## Common Workflows

### New User Onboarding

```
1. "Redeem referral code CLAWD2024"     → Get $15 USDC
2. "Check my balance"                    → Verify funds arrived
3. "Verify my identity"                  → Enable premium services
4. "Search for domains with 'myproject'" → Find a domain
5. "Buy myproject.xyz"                   → Purchase with USDC
```

### Domain + DNS Setup

```
1. "Search for coolapp domains"          → Find available options
2. "Buy coolapp.dev for Jane Doe"        → Purchase domain
3. "Point coolapp.dev to 192.0.2.1"      → Create A record
4. "Add www.coolapp.dev as alias"        → Create CNAME record
5. "Show DNS for coolapp.dev"            → Verify configuration
```

### Using x402 Services

```
1. "Find AI image services"              → Discover services
2. "Generate an image of a sunset"       → Pays automatically via x402
3. "Show my recent transactions"         → Review payments
```

---

## Error Reference

### Wallet Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Configuration not found` | Wallet not initialized | First use creates wallet automatically |
| `No wallet found in keychain` | Keychain access failed | Check OS keychain permissions |
| `Insufficient balance` | Not enough USDC | Fund wallet or redeem referral code |
| `Transaction failed` | Network or gas issue | Retry; check Base network status |

### Referral Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Invalid referral code` | Code doesn't exist | Check code spelling (case-insensitive) |
| `Code has already been redeemed` | Code used up | Request a new code |
| `Code has expired` | Past expiration date | Request a new code |
| `This wallet has already redeemed` | One redemption per wallet | Cannot redeem again |
| `Treasury has insufficient balance` | Treasury empty | Contact support |

### TAP Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Not registered` | No TAP agent | Call `tap_register_agent` first |
| `Already verified` | Already have verification | Use `tap_get_status` to check level |
| `Verification failed` | KYC/KYB rejected | Contact TAP registry support |

### Domain Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Domain not available` | Already registered | Try different TLD or name |
| `Invalid domain format` | Bad characters in name | Use only a-z, 0-9, hyphens |
| `Payment verification failed` | tx_hash invalid | Check transaction completed on Base |
| `Not authorized` | Wallet doesn't own domain | Use wallet that purchased domain |
| `Backend connection failed` | Backend unreachable | Check `CLAWD_BACKEND_URL` |

---

## Configuration

### Environment Variables

**MCP Server:**

```bash
# Required for domain features
CLAWD_BACKEND_URL=https://clawd-domain-backend-production.up.railway.app

# TAP configuration
CLAWD_TAP_REGISTRY=https://tap-registry.visa.com/v1  # Production
CLAWD_TAP_MOCK_MODE=true                              # Demo mode (no real registry)

# Referral system (operators only)
CLAWD_TREASURY_PRIVATE_KEY=0x...                      # Treasury wallet for payouts
```

**Backend (Railway deployment):**

```bash
PORKBUN_API_KEY=pk1_...          # From porkbun.com/account/api
PORKBUN_SECRET=sk1_...           # From porkbun.com/account/api
TREASURY_ADDRESS=0x...           # Your wallet to receive domain payments
PUBLIC_URL=https://...           # Your Railway deployment URL
DATABASE_URL=sqlite:////tmp/clawd_domains.db  # Railway uses /tmp
ENVIRONMENT=production
```

### Full MCP Configuration

```json
{
  "mcpServers": {
    "clawd-wallet": {
      "command": "node",
      "args": ["/Users/you/clawd-wallet/dist/mcp-server/index.js"],
      "env": {
        "CLAWD_BACKEND_URL": "https://clawd-domain-backend-production.up.railway.app",
        "CLAWD_TAP_MOCK_MODE": "true"
      }
    }
  }
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Claude Code / MCP Client                                   │
└─────────────────────────┬───────────────────────────────────┘
                          │ MCP Protocol (stdio)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  CLAWD Wallet MCP Server (19 tools)                         │
│  ├─ Wallet: balance, payments, history                      │
│  ├─ Referral: code redemption                               │
│  ├─ TAP: identity verification                              │
│  └─ Domains: search, purchase, DNS                          │
└──────────┬──────────────────────┬───────────────────────────┘
           │                      │
           │ USDC on Base         │ HTTPS
           ▼                      ▼
┌──────────────────┐    ┌────────────────────┐
│  Base Network    │    │  Domain Backend    │
│  (x402 services) │    │  (Railway/FastAPI) │
└──────────────────┘    └─────────┬──────────┘
                                  │
                                  ▼
                        ┌────────────────────┐
                        │  Porkbun API       │
                        └────────────────────┘
```

---

## Security

- **Private keys**: Stored in OS keychain (macOS Keychain, Windows Credential Manager, Linux libsecret)
- **Spend limits**: $10/transaction, $50/day (configurable)
- **TAP credentials**: Stored in `~/.clawd/tap/` with 0600 permissions
- **Payment approval**: All payments require explicit user approval in Claude Code
- **No secrets in code**: All credentials via environment variables or keychain

---

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Run MCP server directly
node dist/mcp-server/index.js

# Run backend locally
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --port 8402 --reload
```

---

## Deploy Backend to Railway

```bash
cd backend
railway login
railway init
railway up

# Set environment variables in Railway dashboard:
# PORKBUN_API_KEY, PORKBUN_SECRET, TREASURY_ADDRESS, PUBLIC_URL, DATABASE_URL
```

---

## Troubleshooting

### "Command not found" when starting MCP server

```bash
# Rebuild the project
npm run build

# Check the path in your MCP config matches your actual install location
ls /path/to/clawd-wallet/dist/mcp-server/index.js
```

### Tools not appearing in Claude Code

1. Restart Claude Code completely (not just reload)
2. Check MCP config syntax in `~/.claude.json`
3. Test server manually: `node dist/mcp-server/index.js`

### Domain purchase stuck at "pending"

1. Check payment transaction completed on [BaseScan](https://basescan.org)
2. Verify `tx_hash` format: `0x` + 64 hex characters
3. Check backend logs for Porkbun API errors

### "Treasury not configured" on referral

Referral redemption requires a treasury wallet. For operators:
```bash
export CLAWD_TREASURY_PRIVATE_KEY=0x...
```

---

## API Reference

See [docs/API.md](docs/API.md) for complete tool input/output schemas.

---

## License

Apache-2.0
