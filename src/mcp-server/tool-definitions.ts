/**
 * MCP Tool definitions for unified CLAWD Wallet
 *
 * All 27 tools:
 * - Wallet (5): x402_payment_request, x402_check_balance, x402_get_address, x402_transaction_history, x402_discover_services
 * - Security (2): x402_get_spending_controls, x402_update_spending_controls
 * - Referral (1): x402_redeem_referral
 * - TAP (4): tap_register_agent, tap_verify_identity, tap_get_status, tap_revoke
 * - Domains (9): clawd_domain_search, clawd_domain_purchase, clawd_domain_confirm, clawd_domain_list, clawd_dns_list, clawd_dns_create, clawd_dns_delete, clawd_domain_nameservers, clawd_domain_auth_code
 * - Canton (6): canton_check_balance, canton_list_holdings, canton_get_party_info, canton_configure, canton_transfer, canton_transaction_history
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const TOOLS: Tool[] = [
  // ============================================================================
  // WALLET TOOLS (5)
  // ============================================================================
  {
    name: 'x402_payment_request',
    description:
      'Make an x402 payment request to a service. Handles the full payment flow including approval and execution.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to make the request to',
        },
        method: {
          type: 'string',
          description: 'HTTP method (GET, POST, etc.)',
          default: 'GET',
        },
        description: {
          type: 'string',
          description: 'Description of the payment',
        },
        maxAmount: {
          type: 'number',
          description: 'Maximum amount willing to pay (in USDC)',
        },
        body: {
          type: 'string',
          description: 'Request body for POST requests',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'x402_check_balance',
    description: 'Check current USDC balance on Base network',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'x402_get_address',
    description: 'Get wallet address for receiving funds',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'x402_transaction_history',
    description: 'Get recent transaction history',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of transactions to return',
          default: 10,
        },
      },
    },
  },
  {
    name: 'x402_discover_services',
    description: 'Discover available x402 services',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category',
        },
        query: {
          type: 'string',
          description: 'Search query',
        },
      },
    },
  },

  // ============================================================================
  // SECURITY TOOLS (2)
  // ============================================================================
  {
    name: 'x402_get_spending_controls',
    description:
      'Get current spending controls and limits for your wallet. Shows maxTransactionAmount, ' +
      'autoApproveUnder threshold, and dailyLimit settings.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'x402_update_spending_controls',
    description:
      'Update spending controls and limits for your wallet. Use this to set maximum transaction amount, ' +
      'auto-approve threshold, or daily spending limit. All amounts are in USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        maxTransactionAmount: {
          type: 'number',
          description: 'Maximum amount allowed per transaction in USDC (e.g., 15 for $15 max)',
        },
        autoApproveUnder: {
          type: 'number',
          description:
            'Transactions under this amount are auto-approved without prompt (e.g., 0.1 for $0.10)',
        },
        dailyLimit: {
          type: 'number',
          description: 'Maximum total spending allowed per day in USDC (e.g., 50 for $50/day)',
        },
      },
    },
  },

  // ============================================================================
  // REFERRAL TOOLS (1)
  // ============================================================================
  {
    name: 'x402_redeem_referral',
    description:
      'Redeem a referral code to receive free USDC during onboarding. ' +
      'Enter a valid referral code and USDC will be sent directly to your wallet. ' +
      'This is typically the first step when setting up a new wallet.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The referral code to redeem (e.g., "CLAWD2024" or "ABC123XY")',
        },
      },
      required: ['code'],
    },
  },

  // ============================================================================
  // TAP TOOLS (4)
  // ============================================================================
  {
    name: 'tap_register_agent',
    description:
      'Register this wallet as a TAP agent with the registry. This is the first step before verification. ' +
      'Returns a verification URL for completing identity verification.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Display name for this agent (e.g., "My AI Assistant")',
        },
      },
    },
  },
  {
    name: 'tap_verify_identity',
    description:
      'Complete TAP identity verification for premium merchant access. ' +
      'Levels: "email" (basic), "kyc" (individual verification), "kyb" (business verification).',
    inputSchema: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          enum: ['email', 'kyc', 'kyb'],
          description:
            'Verification level: email (basic), kyc (individual), kyb (business). Default is kyc.',
        },
        name: {
          type: 'string',
          description: 'Display name for this agent (if not already registered)',
        },
      },
    },
  },
  {
    name: 'tap_get_status',
    description:
      'Get current TAP verification status including agent ID, identity level, reputation score, and attestation expiry.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'tap_revoke',
    description:
      'Revoke TAP credentials and remove this agent from the registry. ' +
      'Use this if you want to re-register with different details or remove identity verification.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // ============================================================================
  // DOMAIN TOOLS (9)
  // ============================================================================
  {
    name: 'clawd_domain_search',
    description:
      'Search for available domain names. Returns availability and pricing for each TLD. ' +
      'Use this when a user wants to find a domain for their project.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            "The domain name to search (without TLD), e.g., 'myproject' or 'coolapp'",
        },
        tlds: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Optional list of TLDs to check. Defaults to [com, dev, io, app, xyz, co, org]',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'clawd_domain_purchase',
    description:
      'Initiate a domain purchase. Returns payment details that should be used with ' +
      'the x402_payment_request tool. After payment, call clawd_domain_confirm. ' +
      'IMPORTANT: Provide registrant info (first_name, last_name, email) for ICANN compliance.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: "Full domain name to purchase, e.g., 'myproject.dev'",
        },
        years: {
          type: 'number',
          description: 'Number of years to register (1-10). Default is 1.',
        },
        first_name: {
          type: 'string',
          description:
            'Registrant first name (required for ICANN). The person who will own the domain.',
        },
        last_name: {
          type: 'string',
          description:
            'Registrant last name (required for ICANN). The person who will own the domain.',
        },
        email: {
          type: 'string',
          description:
            'Registrant email (required for ICANN). Used for domain transfer verification.',
        },
        phone: {
          type: 'string',
          description: "Optional phone number in E.164 format, e.g., '+1.5551234567'",
        },
        address: {
          type: 'string',
          description: 'Optional street address for registrant contact',
        },
        city: {
          type: 'string',
          description: 'Optional city for registrant contact',
        },
        state: {
          type: 'string',
          description: "Optional state/province code, e.g., 'CA'",
        },
        zip_code: {
          type: 'string',
          description: 'Optional postal/zip code',
        },
        country: {
          type: 'string',
          description: "Optional 2-letter country code, e.g., 'US'. Default is 'US'.",
        },
      },
      required: ['domain', 'first_name', 'last_name', 'email'],
    },
  },
  {
    name: 'clawd_domain_confirm',
    description:
      'Confirm a domain purchase after payment has been made. ' +
      'Call this with the purchase_id from clawd_domain_purchase and the tx_hash from the payment.',
    inputSchema: {
      type: 'object',
      properties: {
        purchase_id: {
          type: 'string',
          description: 'The purchase_id returned from clawd_domain_purchase',
        },
        tx_hash: {
          type: 'string',
          description:
            'The transaction hash from the USDC payment (from x402_payment_request result)',
        },
      },
      required: ['purchase_id', 'tx_hash'],
    },
  },
  {
    name: 'clawd_domain_list',
    description:
      'List domains YOU own that were registered through Clawd Domain Marketplace. ' +
      'Requires your wallet address. Each wallet only sees its own domains.',
    inputSchema: {
      type: 'object',
      properties: {
        wallet: {
          type: 'string',
          description: 'Your wallet address (only shows domains you own)',
        },
      },
      required: ['wallet'],
    },
  },
  {
    name: 'clawd_dns_list',
    description:
      'List all DNS records for a domain. Shows A, AAAA, CNAME, MX, TXT, and other records. ' +
      'Requires wallet address that purchased the domain.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: "The domain name, e.g., 'myproject.dev'",
        },
        wallet: {
          type: 'string',
          description:
            'Your wallet address (must be the one that purchased the domain)',
        },
      },
      required: ['domain', 'wallet'],
    },
  },
  {
    name: 'clawd_dns_create',
    description:
      'Create a DNS record for your domain. Use this to point your domain to a server (A record), ' +
      'set up a subdomain (CNAME), configure email (MX), or verify ownership (TXT). ' +
      'Requires wallet address that purchased the domain.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: "The domain name, e.g., 'myproject.dev'",
        },
        wallet: {
          type: 'string',
          description:
            'Your wallet address (must be the one that purchased the domain)',
        },
        record_type: {
          type: 'string',
          enum: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV'],
          description:
            'Type of DNS record: A (IPv4), AAAA (IPv6), CNAME (alias), MX (email), TXT (text/verification)',
        },
        name: {
          type: 'string',
          description:
            "Subdomain or record name. Use empty string '' for root domain, 'www' for www subdomain, etc.",
        },
        content: {
          type: 'string',
          description:
            'Record value: IP address for A/AAAA, target domain for CNAME, mail server for MX, text for TXT',
        },
        ttl: {
          type: 'number',
          description: 'Time-to-live in seconds (300-86400). Default is 600.',
        },
      },
      required: ['domain', 'wallet', 'record_type', 'name', 'content'],
    },
  },
  {
    name: 'clawd_dns_delete',
    description:
      'Delete a DNS record by its ID. Get record IDs from clawd_dns_list. ' +
      'Requires wallet address that purchased the domain.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: "The domain name, e.g., 'myproject.dev'",
        },
        wallet: {
          type: 'string',
          description:
            'Your wallet address (must be the one that purchased the domain)',
        },
        record_id: {
          type: 'string',
          description: 'The ID of the DNS record to delete (from clawd_dns_list)',
        },
      },
      required: ['domain', 'wallet', 'record_id'],
    },
  },
  {
    name: 'clawd_domain_nameservers',
    description:
      'Update nameservers for your domain. Use this to point your domain to external DNS providers ' +
      'like Cloudflare, Vercel, or AWS Route53. Requires wallet address that purchased the domain.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: "The domain name, e.g., 'myproject.dev'",
        },
        wallet: {
          type: 'string',
          description:
            'Your wallet address (must be the one that purchased the domain)',
        },
        nameservers: {
          type: 'array',
          items: { type: 'string' },
          description:
            "List of nameservers (2-6). Example: ['ns1.vercel-dns.com', 'ns2.vercel-dns.com']",
        },
      },
      required: ['domain', 'wallet', 'nameservers'],
    },
  },
  {
    name: 'clawd_domain_auth_code',
    description:
      'Get the authorization/EPP code to transfer your domain to another registrar. ' +
      'You legally own the domain and can transfer it anytime. Requires wallet address that purchased the domain.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: "The domain name to get auth code for, e.g., 'myproject.dev'",
        },
        wallet: {
          type: 'string',
          description:
            'Your wallet address (must be the one that purchased the domain)',
        },
      },
      required: ['domain', 'wallet'],
    },
  },

  // ============================================================================
  // CANTON NETWORK TOOLS (6)
  // ============================================================================
  {
    name: 'canton_check_balance',
    description:
      'Check Canton Coin (CC) balance on Canton Network (LocalNet when CANTON_USE_LOCALNET=true, else DevNet). ' +
      'Returns the configured party\'s CC balance.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'canton_list_holdings',
    description:
      'List all CIP-56 token holdings for your Canton party. ' +
      'Shows all tokens held including Canton Coin (CC) and any other CIP-56 compliant tokens.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'canton_get_party_info',
    description:
      'Get Canton party information including party ID, display name, validator URL, and connection status.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'canton_configure',
    description:
      'Configure Canton Network. Use LocalNet when CANTON_USE_LOCALNET=true (default URLs: ledger 127.0.0.1:2975, validator localhost:2000). ' +
      'Omit partyId to create a new external party; or provide partyId (and optional privateKey for signing transfers).',
    inputSchema: {
      type: 'object',
      properties: {
        partyId: {
          type: 'string',
          description: 'Existing Canton party ID. Omit to create a new party.',
        },
        displayName: {
          type: 'string',
          description: 'Display name for the party (used when creating a new party)',
        },
        privateKey: {
          type: 'string',
          description: 'Base64 Ed25519 private key for signing (required for transfers when using an existing party)',
        },
        validatorUrl: {
          type: 'string',
          description: 'Optional custom validator API URL (overrides DevNet/LocalNet default)',
        },
        ledgerApiUrl: {
          type: 'string',
          description: 'Optional custom Ledger API URL (overrides DevNet/LocalNet default)',
        },
      },
    },
  },
  {
    name: 'canton_transfer',
    description:
      'Transfer Canton tokens to another party (LocalNet when CANTON_USE_LOCALNET=true, else DevNet). ' +
      'Supports Canton Coin (CC) and other CIP-56 compliant tokens.',
    inputSchema: {
      type: 'object',
      properties: {
        recipient: {
          type: 'string',
          description: 'Recipient party ID',
        },
        amount: {
          type: 'string',
          description: 'Amount to transfer (e.g., "10.5" for 10.5 CC)',
        },
        tokenId: {
          type: 'string',
          description: 'Token/asset ID. Defaults to Canton Coin (CC) if not specified.',
        },
      },
      required: ['recipient', 'amount'],
    },
  },
  {
    name: 'canton_transaction_history',
    description:
      'View recent Canton transfer history for your party. ' +
      'Shows both sent and received transfers.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of transactions to return (default: 10)',
        },
      },
    },
  },
];
