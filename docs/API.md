# CLAWD Wallet API Reference

Complete reference for all 19 MCP tools.

---

## Wallet Tools

### x402_payment_request

Make an x402 payment to a service.

**Input:**

```json
{
  "url": "https://api.example.com/endpoint",
  "method": "GET",
  "description": "Fetch premium data",
  "maxAmount": 1.00,
  "body": "{\"query\": \"test\"}"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | The URL to make the request to |
| `method` | string | No | HTTP method (GET, POST, etc.). Default: GET |
| `description` | string | No | Human-readable description of the payment |
| `maxAmount` | number | No | Maximum amount willing to pay (in USDC) |
| `body` | string | No | Request body for POST requests (JSON string) |

**Output (Success):**

```json
{
  "success": true,
  "paid": true,
  "amount": "0.01",
  "currency": "USDC",
  "txHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "response": {
    "data": "..."
  }
}
```

**Output (Error):**

```json
{
  "success": false,
  "error": "Insufficient balance"
}
```

---

### x402_check_balance

Check current USDC balance on Base network.

**Input:**

```json
{}
```

No parameters required.

**Output:**

```json
{
  "success": true,
  "balance": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
    "amount": "25.50",
    "currency": "USDC",
    "decimals": 6
  }
}
```

---

### x402_get_address

Get wallet address for receiving funds.

**Input:**

```json
{}
```

No parameters required.

**Output:**

```json
{
  "success": true,
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
  "network": "base",
  "fundingInstructions": "Send USDC on Base network to this address"
}
```

---

### x402_transaction_history

Get recent transaction history.

**Input:**

```json
{
  "limit": 10
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Number of transactions to return. Default: 10 |

**Output:**

```json
{
  "success": true,
  "transactions": [
    {
      "txHash": "0x1234...",
      "type": "payment",
      "amount": "0.01",
      "currency": "USDC",
      "recipient": "0xabcd...",
      "timestamp": "2024-01-15T10:30:00Z",
      "status": "confirmed"
    }
  ],
  "count": 1
}
```

---

### x402_discover_services

Discover available x402 services.

**Input:**

```json
{
  "category": "ai",
  "query": "image generation"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by category (ai, data, compute, etc.) |
| `query` | string | No | Search query |

**Output:**

```json
{
  "success": true,
  "services": [
    {
      "name": "AI Image Generator",
      "url": "https://api.example.com/generate",
      "price": "0.05",
      "currency": "USDC",
      "description": "Generate images from text prompts"
    }
  ],
  "count": 1
}
```

---

## Referral Tools

### x402_redeem_referral

Redeem a referral code to receive free USDC.

**Input:**

```json
{
  "code": "CLAWD2024"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | The referral code to redeem (case-insensitive) |

**Output (Success):**

```json
{
  "success": true,
  "code": "CLAWD2024",
  "amount": 15,
  "currency": "USDC",
  "txHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "blockNumber": 12345678,
  "recipientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
  "explorerUrl": "https://basescan.org/tx/0x1234...",
  "message": "Successfully redeemed $15 USDC! Check your balance with x402_check_balance."
}
```

**Output (Already Redeemed):**

```json
{
  "success": false,
  "error": "This wallet has already redeemed a referral code",
  "alreadyRedeemed": true
}
```

**Output (Invalid Code):**

```json
{
  "success": false,
  "error": "Invalid referral code"
}
```

---

## TAP Identity Tools

### tap_register_agent

Register this wallet as a TAP agent with the registry.

**Input:**

```json
{
  "name": "My AI Assistant"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | Display name for this agent. Default: "Clawd Agent (0x...)" |

**Output:**

```json
{
  "success": true,
  "status": "registered",
  "agentId": "agent_abc123def456",
  "verificationUrl": "https://tap-registry.visa.com/verify/agent_abc123def456",
  "mockMode": true,
  "message": "[DEMO MODE] Agent registered as \"My AI Assistant\". Use tap_verify_identity to complete verification."
}
```

---

### tap_verify_identity

Complete TAP identity verification for premium merchant access.

**Input:**

```json
{
  "level": "kyc",
  "name": "My AI Assistant"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `level` | string | No | Verification level: `email`, `kyc`, or `kyb`. Default: `kyc` |
| `name` | string | No | Display name if not already registered |

**Verification Levels:**

| Level | Description | Access |
|-------|-------------|--------|
| `email` | Basic email verification | Standard merchants |
| `kyc` | Individual identity verification | Premium merchants |
| `kyb` | Business verification | Enterprise merchants |

**Output:**

```json
{
  "success": true,
  "status": "verified",
  "agentId": "agent_abc123def456",
  "identityLevel": "kyc",
  "reputationScore": 50.0,
  "mockMode": true,
  "message": "[DEMO MODE] Identity verified at KYC level. In production, TAP headers will be added to x402 payments."
}
```

---

### tap_get_status

Get current TAP verification status.

**Input:**

```json
{}
```

No parameters required.

**Output (Verified):**

```json
{
  "success": true,
  "verified": true,
  "agentId": "agent_abc123def456",
  "identityLevel": "kyc",
  "reputationScore": 75.0,
  "attestationExpires": "2025-01-15T00:00:00Z",
  "registryUrl": "https://tap-registry.visa.com/v1",
  "mockMode": false
}
```

**Output (Not Registered):**

```json
{
  "success": true,
  "verified": false,
  "message": "Not registered. Use tap_register_agent to register, then tap_verify_identity to verify."
}
```

---

### tap_revoke

Revoke TAP credentials and remove from registry.

**Input:**

```json
{}
```

No parameters required.

**Output:**

```json
{
  "success": true,
  "status": "revoked",
  "message": "TAP credentials revoked and agent removed from registry."
}
```

---

## Domain Tools

### clawd_domain_search

Search for available domain names.

**Input:**

```json
{
  "query": "myproject",
  "tlds": ["com", "dev", "io", "xyz"]
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Domain name to search (without TLD) |
| `tlds` | array | No | TLDs to check. Default: `["com", "dev", "io", "app", "xyz", "co", "org"]` |

**Output:**

```json
{
  "query": "myproject",
  "results": [
    {
      "domain": "myproject.dev",
      "available": true,
      "first_year_price_usdc": "14.99",
      "renewal_price_usdc": "14.99",
      "premium": false
    },
    {
      "domain": "myproject.xyz",
      "available": true,
      "first_year_price_usdc": "4.99",
      "renewal_price_usdc": "12.99",
      "premium": false
    },
    {
      "domain": "myproject.com",
      "available": false
    }
  ]
}
```

---

### clawd_domain_purchase

Initiate a domain purchase.

**Input:**

```json
{
  "domain": "myproject.dev",
  "years": 1,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+1.5551234567",
  "address": "123 Main St",
  "city": "San Francisco",
  "state": "CA",
  "zip_code": "94102",
  "country": "US"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | Yes | Full domain name (e.g., `myproject.dev`) |
| `years` | number | No | Registration years (1-10). Default: 1 |
| `first_name` | string | Yes | Registrant first name (ICANN required) |
| `last_name` | string | Yes | Registrant last name (ICANN required) |
| `email` | string | Yes | Registrant email (ICANN required) |
| `phone` | string | No | Phone in E.164 format |
| `address` | string | No | Street address |
| `city` | string | No | City |
| `state` | string | No | State/province code |
| `zip_code` | string | No | Postal code |
| `country` | string | No | 2-letter country code. Default: `US` |

**Output:**

```json
{
  "purchase_id": "pur_abc123def456",
  "domain": "myproject.dev",
  "price_usdc": "14.99",
  "payment_address": "0x1234567890abcdef1234567890abcdef12345678",
  "expires_at": "2024-01-15T11:00:00Z",
  "instructions": "Send 14.99 USDC to the payment address, then call clawd_domain_confirm with the tx_hash"
}
```

---

### clawd_domain_confirm

Confirm a domain purchase after payment.

**Input:**

```json
{
  "purchase_id": "pur_abc123def456",
  "tx_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `purchase_id` | string | Yes | The purchase_id from `clawd_domain_purchase` |
| `tx_hash` | string | Yes | Transaction hash from the USDC payment (0x + 64 hex chars) |

**Output:**

```json
{
  "success": true,
  "domain": "myproject.dev",
  "status": "registered",
  "expires": "2025-01-15",
  "nameservers": [
    "ns1.porkbun.com",
    "ns2.porkbun.com"
  ]
}
```

---

### clawd_domain_list

List domains you own.

**Input:**

```json
{
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `wallet` | string | Yes | Your wallet address |

**Output:**

```json
{
  "domains": [
    {
      "domain": "myproject.dev",
      "status": "active",
      "expires": "2025-01-15",
      "auto_renew": false
    }
  ],
  "count": 1
}
```

---

### clawd_dns_list

List all DNS records for a domain.

**Input:**

```json
{
  "domain": "myproject.dev",
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | Yes | The domain name |
| `wallet` | string | Yes | Your wallet address (must own domain) |

**Output:**

```json
{
  "domain": "myproject.dev",
  "records": [
    {
      "id": "rec_123",
      "type": "A",
      "name": "",
      "content": "192.0.2.1",
      "ttl": 600
    },
    {
      "id": "rec_124",
      "type": "CNAME",
      "name": "www",
      "content": "myproject.dev",
      "ttl": 600
    }
  ]
}
```

---

### clawd_dns_create

Create a DNS record.

**Input:**

```json
{
  "domain": "myproject.dev",
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
  "record_type": "A",
  "name": "",
  "content": "192.0.2.1",
  "ttl": 600
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | Yes | The domain name |
| `wallet` | string | Yes | Your wallet address (must own domain) |
| `record_type` | string | Yes | Record type: `A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS`, `SRV` |
| `name` | string | Yes | Subdomain name (`""` for root, `"www"` for www, etc.) |
| `content` | string | Yes | Record value (IP, domain, text, etc.) |
| `ttl` | number | No | TTL in seconds (300-86400). Default: 600 |

**DNS Record Types:**

| Type | Content Format | Example Use |
|------|----------------|-------------|
| `A` | IPv4 address | Point domain to server |
| `AAAA` | IPv6 address | Point domain to IPv6 server |
| `CNAME` | Domain name | Alias (www → root) |
| `MX` | Mail server | Email configuration |
| `TXT` | Text string | Verification, SPF, DKIM |

**Output:**

```json
{
  "success": true,
  "record": {
    "id": "rec_125",
    "type": "A",
    "name": "",
    "content": "192.0.2.1",
    "ttl": 600
  }
}
```

---

### clawd_dns_delete

Delete a DNS record.

**Input:**

```json
{
  "domain": "myproject.dev",
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
  "record_id": "rec_123"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | Yes | The domain name |
| `wallet` | string | Yes | Your wallet address (must own domain) |
| `record_id` | string | Yes | Record ID from `clawd_dns_list` |

**Output:**

```json
{
  "success": true,
  "deleted": "rec_123"
}
```

---

### clawd_domain_nameservers

Update nameservers for your domain.

**Input:**

```json
{
  "domain": "myproject.dev",
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f12345",
  "nameservers": [
    "ns1.vercel-dns.com",
    "ns2.vercel-dns.com"
  ]
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | Yes | The domain name |
| `wallet` | string | Yes | Your wallet address (must own domain) |
| `nameservers` | array | Yes | List of 2-6 nameservers |

**Common Nameservers:**

| Provider | Nameservers |
|----------|-------------|
| Vercel | `ns1.vercel-dns.com`, `ns2.vercel-dns.com` |
| Cloudflare | `*.ns.cloudflare.com` (assigned per account) |
| AWS Route53 | `ns-*.awsdns-*.com` (assigned per zone) |
| Porkbun (default) | `ns1.porkbun.com`, `ns2.porkbun.com` |

**Output:**

```json
{
  "success": true,
  "domain": "myproject.dev",
  "nameservers": [
    "ns1.vercel-dns.com",
    "ns2.vercel-dns.com"
  ]
}
```

---

### clawd_domain_auth_code

Get the authorization/EPP code to transfer your domain.

**Input:**

```json
{
  "domain": "myproject.dev",
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f12345"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | Yes | The domain name |
| `wallet` | string | Yes | Your wallet address (must own domain) |

**Output:**

```json
{
  "success": true,
  "domain": "myproject.dev",
  "auth_code": "Xy7#mN9@kL2$",
  "instructions": "Use this code to transfer your domain to another registrar. The code is valid for 14 days."
}
```

---

## Error Response Format

All tools return errors in this format:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

Some tools include additional context:

```json
{
  "success": false,
  "error": "This wallet has already redeemed a referral code",
  "alreadyRedeemed": true
}
```
