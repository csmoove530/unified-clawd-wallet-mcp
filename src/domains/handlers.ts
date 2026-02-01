/**
 * Domain tool handlers - format responses for MCP
 */

import { domainClient } from './backend-client.js';

const BACKEND_URL = process.env.CLAWD_BACKEND_URL || 'http://localhost:8402';

/**
 * Handle domain search
 */
export async function handleDomainSearch(args: {
  query: string;
  tlds?: string[];
}): Promise<string> {
  const data = await domainClient.searchDomains(args.query, args.tlds);

  // Format results nicely
  let output = `## Domain Search Results for "${data.query}"\n\n`;

  if (data.mock_mode) {
    output += `**Mock Mode** - Using simulated data\n\n`;
  }

  output += `| Domain | Status | First Year | Renewal |\n`;
  output += `|--------|--------|------------|----------|\n`;

  for (const r of data.results) {
    const status = r.available ? 'Available' : 'Taken';
    const firstYear = r.first_year_price_usdc
      ? `$${r.first_year_price_usdc}`
      : '-';
    const renewal = r.renewal_price_usdc ? `$${r.renewal_price_usdc}` : '-';
    output += `| ${r.domain} | ${status} | ${firstYear} | ${renewal} |\n`;
  }

  output += `\n*Prices in USDC. Renewal price applies from year 2.*`;

  return output;
}

/**
 * Handle domain purchase initiation
 */
export async function handleDomainPurchase(args: {
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
}): Promise<string> {
  const data = await domainClient.initiatePurchase(args);

  // Build the payment URL for x402
  const paymentUrl = `${BACKEND_URL}/purchase/pay/${data.purchase_id}`;

  // Return structured info for the next step
  let output = `## Purchase Initiated: ${data.domain}\n\n`;
  output += `**Purchase ID:** \`${data.purchase_id}\`\n\n`;
  output += `### Payment Required\n\n`;
  output += `| Field | Value |\n`;
  output += `|-------|-------|\n`;
  output += `| Amount | **${data.payment_request.amount_usdc} USDC** |\n`;
  output += `| Recipient | \`${data.payment_request.recipient}\` |\n`;
  output += `| Network | Base (Chain ID: ${data.payment_request.chain_id}) |\n`;
  output += `| Expires | ${data.payment_request.expires_at} |\n\n`;

  output += `### Next Steps\n\n`;
  output += `1. Use **x402_payment_request** with this URL: \`${paymentUrl}\`\n`;
  output += `2. The payment will be processed automatically via x402\n`;
  output += `3. After payment, call **clawd_domain_confirm** with:\n`;
  output += `   - \`purchase_id\`: \`${data.purchase_id}\`\n`;
  output += `   - \`tx_hash\`: (from payment result)\n\n`;

  output += `**Payment URL for x402_payment_request:**\n\`\`\`\n${paymentUrl}\n\`\`\`\n\n`;
  output += `**Payment Details:**\n\`\`\`json\n${JSON.stringify(data.payment_request, null, 2)}\n\`\`\``;

  return output;
}

/**
 * Handle domain purchase confirmation
 */
export async function handleDomainConfirm(args: {
  purchase_id: string;
  tx_hash: string;
}): Promise<string> {
  const data = await domainClient.confirmPurchase(args.purchase_id, args.tx_hash);

  if (data.status === 'success' || data.status === 'already_completed') {
    let output = `## Domain Registered Successfully!\n\n`;

    if (data.mock_mode) {
      output += `**Mock Mode** - This is a simulated registration\n\n`;
    }

    if (data.domain) {
      output += `| Field | Value |\n`;
      output += `|-------|-------|\n`;
      output += `| Domain | **${data.domain.domain_name}** |\n`;
      output += `| Expires | ${data.domain.expires_at} |\n`;
      output += `| Nameservers | ${data.domain.nameservers.join(', ')} |\n`;
      output += `| Registered | ${data.domain.registered_at} |\n\n`;

      output += `### What's Next?\n\n`;
      output += `- **Configure DNS**: Point your domain to your hosting provider\n`;
      output += `- **Add to Vercel**: \`vercel domains add ${data.domain.domain_name}\`\n`;
      output += `- **Add to Netlify**: Settings -> Domain management -> Add domain\n`;
    }

    return output;
  } else {
    return `## Registration Failed\n\n**Status:** ${data.status}\n**Error:** ${data.error || 'Unknown error'}\n\nPlease try again or contact support.`;
  }
}

/**
 * Handle listing domains for a wallet
 */
export async function handleDomainList(args: { wallet: string }): Promise<string> {
  const data = await domainClient.listDomains(args.wallet);

  if (data.total === 0) {
    return `## Your Domains\n\n**Wallet:** \`${args.wallet}\`\n\nNo domains registered with this wallet yet. Use \`clawd_domain_search\` to find a domain!`;
  }

  let output = `## Your Domains (${data.total})\n\n`;
  output += `**Wallet:** \`${args.wallet}\`\n\n`;

  if (data.mock_mode) {
    output += `**Mock Mode** - Using simulated data\n\n`;
  }

  output += `| Domain | Expires | Nameservers |\n`;
  output += `|--------|---------|-------------|\n`;

  for (const d of data.domains) {
    output += `| ${d.domain_name} | ${d.expires_at} | ${d.nameservers[0]} |\n`;
  }

  output += `\n*Only domains owned by this wallet are shown.*`;

  return output;
}

/**
 * Handle listing DNS records
 */
export async function handleDnsList(args: { domain: string; wallet: string }): Promise<string> {
  const data = await domainClient.getDNSRecords(args.domain, args.wallet);

  if (!data.records || data.records.length === 0) {
    return `## DNS Records for ${args.domain}\n\nNo DNS records configured. Use \`clawd_dns_create\` to add records.`;
  }

  let output = `## DNS Records for ${args.domain}\n\n`;
  output += `| ID | Type | Name | Content | TTL |\n`;
  output += `|----|------|------|---------|-----|\n`;

  for (const r of data.records) {
    const name = r.name || '@';
    output += `| ${r.id} | ${r.type} | ${name} | ${r.content} | ${r.ttl} |\n`;
  }

  output += `\n*Use record ID with \`clawd_dns_delete\` to remove a record.*`;

  return output;
}

/**
 * Handle creating a DNS record
 */
export async function handleDnsCreate(args: {
  domain: string;
  wallet: string;
  record_type: string;
  name: string;
  content: string;
  ttl?: number;
}): Promise<string> {
  const data = await domainClient.createDNSRecord(args);

  let output = `## DNS Record Created\n\n`;
  output += `| Field | Value |\n`;
  output += `|-------|-------|\n`;
  output += `| Domain | ${args.domain} |\n`;
  output += `| Type | ${args.record_type} |\n`;
  output += `| Name | ${args.name || '@'} |\n`;
  output += `| Content | ${args.content} |\n`;
  output += `| Record ID | ${data.record_id} |\n\n`;
  output += `${data.message}`;

  return output;
}

/**
 * Handle deleting a DNS record
 */
export async function handleDnsDelete(args: {
  domain: string;
  wallet: string;
  record_id: string;
}): Promise<string> {
  const data = await domainClient.deleteDNSRecord(args);
  return `## DNS Record Deleted\n\n${data.message}`;
}

/**
 * Handle updating nameservers
 */
export async function handleNameservers(args: {
  domain: string;
  wallet: string;
  nameservers: string[];
}): Promise<string> {
  const data = await domainClient.updateNameservers(args);

  let output = `## Nameservers Updated\n\n`;
  output += `**Domain:** ${data.domain}\n\n`;
  output += `**New Nameservers:**\n`;
  for (const ns of data.nameservers) {
    output += `- ${ns}\n`;
  }
  output += `\n${data.message}`;

  return output;
}

/**
 * Handle getting auth code for domain transfer
 */
export async function handleAuthCode(args: { domain: string; wallet: string }): Promise<string> {
  const data = await domainClient.getAuthCode(args.domain, args.wallet);

  let output = `## Authorization Code for ${data.domain}\n\n`;

  if (data.auth_code) {
    output += `**Auth Code:** \`${data.auth_code}\`\n\n`;
    output += `### How to Transfer\n\n`;
    output += `1. Go to your new registrar (Cloudflare, Namecheap, etc.)\n`;
    output += `2. Start a domain transfer for \`${data.domain}\`\n`;
    output += `3. Enter this auth code when prompted\n`;
    output += `4. Approve the transfer email sent to your registrant email\n`;
    output += `5. Transfer completes in 5-7 days\n\n`;
  } else if (data.manual_required) {
    output += `### Manual Retrieval Required\n\n`;
    output += `The auth code must be retrieved from the Porkbun dashboard:\n\n`;
    if (data.instructions) {
      for (const step of data.instructions) {
        output += `${step}\n`;
      }
    }
    output += `\n**Dashboard URL:** ${data.dashboard_url}\n\n`;
    output += `### After Getting the Code\n\n`;
    output += `1. Go to your new registrar (Cloudflare, Namecheap, etc.)\n`;
    output += `2. Start a domain transfer for \`${data.domain}\`\n`;
    output += `3. Enter the auth code when prompted\n`;
    output += `4. Approve the transfer email sent to your registrant email\n`;
    output += `5. Transfer completes in 5-7 days\n\n`;
  }

  output += `*${data.message}*`;

  return output;
}
