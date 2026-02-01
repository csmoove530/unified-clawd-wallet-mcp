# Claude Code Context - CLAWD Wallet

Context file for Claude Code when working on this codebase.

## Quick Commands

```bash
npm run build      # Compile TypeScript
npm run dev        # Watch mode
node dist/mcp-server/index.js  # Run server
```

## Project Structure

```
src/
├── mcp-server/
│   ├── index.ts              # MCP server entry (19 tools)
│   ├── tools.ts              # Tool implementations
│   └── tool-definitions.ts   # Tool schemas
├── wallet/
│   ├── manager.ts            # Wallet creation/loading
│   ├── keychain.ts           # OS keychain (supports service name param)
│   ├── balance.ts            # USDC balance via ethers.js
│   └── history.ts            # Transaction history
├── x402/
│   ├── client.ts             # HTTP client with x402 handling
│   ├── payment.ts            # EIP-3009 payment execution
│   └── discovery.ts          # Service discovery
├── tap/
│   ├── registry.ts           # TAP registry client (mock mode support)
│   ├── credentials.ts        # Credential management
│   ├── keychain.ts           # Ed25519 key storage
│   ├── signing.ts            # RFC 9421 signatures
│   └── types.ts              # TAP types
├── domains/
│   ├── backend-client.ts     # HTTP client for backend
│   └── handlers.ts           # Domain tool handlers
├── referral/
│   ├── manager.ts            # Code generation/validation
│   ├── treasury.ts           # USDC payout wallet
│   └── types.ts              # Referral types
├── security/
│   ├── limits.ts             # Spend limits
│   └── audit.ts              # Audit logging
├── config/
│   ├── manager.ts            # Config management
│   └── schema.ts             # Zod validation
└── types/
    └── index.ts              # Shared types

backend/                      # Python FastAPI
├── src/
│   ├── main.py              # API endpoints
│   ├── porkbun.py           # Porkbun API client
│   ├── payments.py          # USDC payment verification
│   └── database.py          # SQLite/PostgreSQL
├── Dockerfile
└── railway.toml
```

## All 19 MCP Tools

| Category | Tool | Handler |
|----------|------|---------|
| Wallet | `x402_payment_request` | `MCPTools.paymentRequest()` |
| Wallet | `x402_check_balance` | `MCPTools.checkBalance()` |
| Wallet | `x402_get_address` | `MCPTools.getAddress()` |
| Wallet | `x402_transaction_history` | `MCPTools.transactionHistory()` |
| Wallet | `x402_discover_services` | `MCPTools.discoverServices()` |
| Referral | `x402_redeem_referral` | `MCPTools.redeemReferral()` |
| TAP | `tap_register_agent` | `MCPTools.registerAgent()` |
| TAP | `tap_verify_identity` | `MCPTools.verifyIdentity()` |
| TAP | `tap_get_status` | `MCPTools.getTapStatus()` |
| TAP | `tap_revoke` | `MCPTools.revokeAgent()` |
| Domains | `clawd_domain_search` | `MCPTools.domainSearch()` |
| Domains | `clawd_domain_purchase` | `MCPTools.domainPurchase()` |
| Domains | `clawd_domain_confirm` | `MCPTools.domainConfirm()` |
| Domains | `clawd_domain_list` | `MCPTools.domainList()` |
| Domains | `clawd_dns_list` | `MCPTools.dnsList()` |
| Domains | `clawd_dns_create` | `MCPTools.dnsCreate()` |
| Domains | `clawd_dns_delete` | `MCPTools.dnsDelete()` |
| Domains | `clawd_domain_nameservers` | `MCPTools.domainNameservers()` |
| Domains | `clawd_domain_auth_code` | `MCPTools.domainAuthCode()` |

## Key Patterns

### Adding a New Tool

1. Add schema to `tool-definitions.ts`
2. Add handler to `tools.ts`
3. Add case to switch in `index.ts`
4. Update tool count comment
5. Rebuild: `npm run build`

### Keychain Usage

```typescript
// Default service (clawd-wallet)
await Keychain.getPrivateKey();
await Keychain.savePrivateKey(key);

// Custom service (e.g., treasury)
await Keychain.getPrivateKey('clawd-treasury');
await Keychain.savePrivateKey(key, 'clawd-treasury');
```

### TAP Mock Mode

Enabled when:
- `CLAWD_TAP_MOCK_MODE=true`, or
- `CLAWD_TAP_REGISTRY=mock://localhost`

Mock mode skips real registry calls, returns simulated responses.

### Audit Actions

```typescript
type AuditAction =
  | 'payment_approved' | 'payment_executed' | 'payment_failed' | 'payment_error'
  | 'config_changed' | 'wallet_created' | 'wallet_exported' | 'limit_exceeded'
  | 'tap_verified' | 'tap_registered' | 'tap_revoked'
  | 'tap_headers_included' | 'tap_headers_skipped'
  | 'referral_redeemed' | 'referral_redemption_failed';
```

## Environment Variables

### MCP Server

```bash
CLAWD_BACKEND_URL=https://clawd-domain-backend-production.up.railway.app
CLAWD_TAP_REGISTRY=https://tap-registry.visa.com/v1
CLAWD_TAP_MOCK_MODE=true
CLAWD_TREASURY_PRIVATE_KEY=0x...  # For referral payouts
```

### Backend (Railway)

```bash
PORKBUN_API_KEY=pk1_...
PORKBUN_SECRET=sk1_...
TREASURY_ADDRESS=0x...
PUBLIC_URL=https://clawd-domain-backend-production.up.railway.app
DATABASE_URL=sqlite:////tmp/clawd_domains.db
ENVIRONMENT=production
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `Configuration not found` | First run | Auto-creates on first use |
| `No wallet found in keychain` | Keychain access | Check OS permissions |
| Domain tools fail | Backend unreachable | Check `CLAWD_BACKEND_URL` |
| TAP errors | No mock mode | Set `CLAWD_TAP_MOCK_MODE=true` |
| Referral fails | No treasury | Set `CLAWD_TREASURY_PRIVATE_KEY` |

## Testing Changes

```bash
# Rebuild
npm run build

# Test MCP server directly
node dist/mcp-server/index.js

# Test backend locally
cd backend
uvicorn src.main:app --port 8402 --reload
```

## Data Locations

| Data | Path |
|------|------|
| Config | `~/.clawd/config.json` |
| Audit log | `~/.clawd/audit.log` |
| TAP credentials | `~/.clawd/tap/` |
| Referral codes | `~/.clawd/referral/codes.json` |
| Transaction history | `~/.clawd/history.json` |
