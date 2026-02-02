#!/usr/bin/env node

/**
 * Unified CLAWD Wallet MCP Server
 *
 * Provides 21 tools for:
 * - x402 payments (5 tools)
 * - Security/Spending controls (2 tools)
 * - Referral (1 tool)
 * - TAP identity verification (4 tools)
 * - Domain registration and DNS management (9 tools)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TOOLS } from './tool-definitions.js';
import { MCPTools } from './tools.js';

const BACKEND_URL = process.env.CLAWD_BACKEND_URL || 'http://localhost:8402';

const server = new Server(
  {
    name: 'clawd-wallet',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: any;

    switch (name) {
      // Wallet tools
      case 'x402_payment_request':
        result = await MCPTools.paymentRequest(args as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };

      case 'x402_check_balance':
        result = await MCPTools.checkBalance();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };

      case 'x402_get_address':
        result = await MCPTools.getAddress();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };

      case 'x402_transaction_history':
        result = await MCPTools.transactionHistory(args?.limit as number);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };

      case 'x402_discover_services':
        result = await MCPTools.discoverServices(
          args?.category as string,
          args?.query as string
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };

      // Security tools
      case 'x402_get_spending_controls':
        result = await MCPTools.getSpendingControls();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };

      case 'x402_update_spending_controls':
        result = await MCPTools.updateSpendingControls(
          args as {
            maxTransactionAmount?: number;
            autoApproveUnder?: number;
            dailyLimit?: number;
          }
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };

      // Referral tools
      case 'x402_redeem_referral':
        result = await MCPTools.redeemReferral(args as { code: string });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };

      // TAP tools
      case 'tap_register_agent':
        result = await MCPTools.registerAgent(args as { name?: string });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };

      case 'tap_verify_identity':
        result = await MCPTools.verifyIdentity(args as { level?: string; name?: string });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };

      case 'tap_get_status':
        result = await MCPTools.getTapStatus();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };

      case 'tap_revoke':
        result = await MCPTools.revokeAgent();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };

      // Domain tools
      case 'clawd_domain_search':
        result = await MCPTools.domainSearch(args as { query: string; tlds?: string[] });
        return {
          content: [{ type: 'text', text: result }],
        };

      case 'clawd_domain_purchase':
        result = await MCPTools.domainPurchase(
          args as {
            domain: string;
            years?: number;
            first_name: string;
            last_name: string;
            email: string;
            phone?: string;
            address?: string;
            city?: string;
            state?: string;
            zip_code?: string;
            country?: string;
          }
        );
        return {
          content: [{ type: 'text', text: result }],
        };

      case 'clawd_domain_confirm':
        result = await MCPTools.domainConfirm(
          args as { purchase_id: string; tx_hash: string }
        );
        return {
          content: [{ type: 'text', text: result }],
        };

      case 'clawd_domain_list':
        result = await MCPTools.domainList(args as { wallet: string });
        return {
          content: [{ type: 'text', text: result }],
        };

      case 'clawd_dns_list':
        result = await MCPTools.dnsList(args as { domain: string; wallet: string });
        return {
          content: [{ type: 'text', text: result }],
        };

      case 'clawd_dns_create':
        result = await MCPTools.dnsCreate(
          args as {
            domain: string;
            wallet: string;
            record_type: string;
            name: string;
            content: string;
            ttl?: number;
          }
        );
        return {
          content: [{ type: 'text', text: result }],
        };

      case 'clawd_dns_delete':
        result = await MCPTools.dnsDelete(
          args as { domain: string; wallet: string; record_id: string }
        );
        return {
          content: [{ type: 'text', text: result }],
        };

      case 'clawd_domain_nameservers':
        result = await MCPTools.domainNameservers(
          args as { domain: string; wallet: string; nameservers: string[] }
        );
        return {
          content: [{ type: 'text', text: result }],
        };

      case 'clawd_domain_auth_code':
        result = await MCPTools.domainAuthCode(args as { domain: string; wallet: string });
        return {
          content: [{ type: 'text', text: result }],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `## Error\n\n${message}\n\nFor domain tools, make sure the backend is running at ${BACKEND_URL}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('CLAWD Wallet MCP server running (21 tools available)');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
