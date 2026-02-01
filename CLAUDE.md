# Claude Code Context - CLAWD Wallet

This file provides context for Claude Code when working on this project.

## Project Overview

CLAWD Wallet is a unified MCP server combining:
1. **x402 payments** - Pay-per-use API access with USDC on Base
2. **TAP identity** - Trusted Agent Protocol for verified identity
3. **Domain registration** - Purchase and manage domains with USDC

## Directory Structure

```
~/clawd-wallet/
├── src/
│   ├── mcp-server/
│   │   ├── index.ts           # Unified MCP server (19 tools)
│   │   ├── tools.ts           # Tool implementations
│   │   └── tool-definitions.ts # All tool schemas
│   ├── wallet/                # Wallet management
│   │   ├── manager.ts         # Wallet creation/loading
│   │   ├── keychain.ts        # OS keychain integration
│   │   ├── balance.ts         # USDC balance checking
│   │   └── history.ts         # Transaction history
│   ├── x402/                  # x402 payment protocol
│   │   ├── client.ts          # HTTP client with x402
│   │   ├── payment.ts         # Payment execution
│   │   └── discovery.ts       # Service discovery
│   ├── tap/                   # Trusted Agent Protocol
│   │   ├── types.ts           # TAP types
│   │   ├── keychain.ts        # TAP key storage
│   │   ├── credentials.ts     # Credential management
│   │   ├── registry.ts        # TAP registry client
│   │   └── signing.ts         # RFC 9421 signatures
│   ├── domains/               # Domain marketplace
│   │   ├── backend-client.ts  # HTTP client for backend
│   │   └── handlers.ts        # Domain tool handlers
│   ├── referral/              # Referral system
│   │   ├── manager.ts         # Code generation/validation
│   │   ├── treasury.ts        # USDC payout wallet
│   │   └── types.ts           # Referral types
│   ├── security/
│   │   ├── limits.ts          # Spend limits
│   │   └── audit.ts           # Audit logging
│   ├── config/
│   │   ├── manager.ts         # Config management
│   │   └── schema.ts          # Zod validation
│   └── types/
│       └── index.ts           # TypeScript types
├── backend/                   # Python FastAPI
│   ├── src/
│   │   ├── main.py           # API endpoints
│   │   ├── config.py         # Configuration
│   │   ├── porkbun.py        # Domain registrar
│   │   ├── payments.py       # Payment verification
│   │   └── database.py       # SQLite/PostgreSQL
│   ├── Dockerfile
│   └── railway.toml
├── package.json
└── tsconfig.json
```

## All 19 MCP Tools

### Wallet (5)
| Tool | Description |
|------|-------------|
| `x402_payment_request` | Execute x402 payment flow |
| `x402_check_balance` | Check USDC balance on Base |
| `x402_get_address` | Get wallet address |
| `x402_transaction_history` | View payment history |
| `x402_discover_services` | Find x402 services |

### Referral (1)
| Tool | Description |
|------|-------------|
| `x402_redeem_referral` | Redeem referral code for free USDC |

### TAP (4)
| Tool | Description |
|------|-------------|
| `tap_register_agent` | Register with TAP registry |
| `tap_verify_identity` | Complete KYC/KYB verification |
| `tap_get_status` | Check verification status |
| `tap_revoke` | Remove TAP credentials |

### Domains (9)
| Tool | Description |
|------|-------------|
| `clawd_domain_search` | Search available domains |
| `clawd_domain_purchase` | Initiate purchase |
| `clawd_domain_confirm` | Confirm after payment |
| `clawd_domain_list` | List owned domains |
| `clawd_dns_list` | List DNS records |
| `clawd_dns_create` | Create DNS record |
| `clawd_dns_delete` | Delete DNS record |
| `clawd_domain_nameservers` | Update nameservers |
| `clawd_domain_auth_code` | Get transfer auth code |

## Key Patterns

### x402 Payment Flow
1. Initial request returns 402 with payment details
2. Parse `accepts` array for payment options
3. Generate EIP-3009 authorization
4. Retry with `X-PAYMENT` header
5. TAP headers added if identity verified

### TAP Verification Flow
1. `tap_register_agent` - Register with registry
2. `tap_verify_identity` - Complete verification (email/kyc/kyb)
3. `tap_get_status` - Check status and reputation

### Domain Purchase Flow
1. `clawd_domain_search` - Find available domains
2. `clawd_domain_purchase` - Get payment details
3. `x402_payment_request` - Execute payment
4. `clawd_domain_confirm` - Confirm with tx_hash

### Referral Redemption Flow
1. New user receives a referral code (e.g., "CLAWD2024")
2. `x402_redeem_referral` - Enter code to receive USDC
3. Treasury wallet sends USDC directly to user's wallet
4. User can now make x402 payments

## Environment Variables

### MCP Server
```bash
CLAWD_BACKEND_URL=http://localhost:8402
CLAWD_TAP_REGISTRY=https://tap-registry.visa.com/v1
CLAWD_TAP_MOCK_MODE=true              # Enable TAP mock mode for demos
CLAWD_TREASURY_PRIVATE_KEY=0x...      # Treasury wallet for referral payouts
```

### Backend
```bash
PORKBUN_API_KEY=pk1_...
PORKBUN_SECRET=sk1_...
TREASURY_ADDRESS=0x...
PUBLIC_URL=https://your-backend.railway.app
DATABASE_URL=sqlite:///./clawd_domains.db
```

## Common Issues

1. **"Configuration not found"** - Run `clawd init` to create wallet
2. **"No wallet found in keychain"** - Wallet not initialized
3. **Domain tools fail** - Check CLAWD_BACKEND_URL is set
4. **Payment verification failed** - Check tx_hash format (0x + 64 hex chars)

## Development Commands

```bash
# Build TypeScript
npm run build

# Watch mode
npm run dev

# Run MCP server
node dist/mcp-server/index.js

# Run backend locally
cd backend
source venv/bin/activate
uvicorn src.main:app --host 0.0.0.0 --port 8402 --reload
```

## Security Notes

- Private keys in OS keychain, not files
- TAP credentials in ~/.clawd/tap/ with 0600 permissions
- Spend limits: $10/tx, $50/day (configurable)
- Never enable SKIP_PAYMENT_VERIFICATION in production
