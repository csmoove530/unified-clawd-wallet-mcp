/**
 * HTTP client for Clawd Domain Marketplace backend
 */

const BACKEND_URL = process.env.CLAWD_BACKEND_URL || 'http://localhost:8402';

export interface SearchResult {
  domain: string;
  available: boolean;
  first_year_price_usdc?: string;
  renewal_price_usdc?: string;
  premium?: boolean;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  mock_mode: boolean;
}

export interface PaymentRequest {
  amount_usdc: string;
  recipient: string;
  chain_id: number;
  memo: string;
  expires_at: string;
}

export interface PurchaseResponse {
  purchase_id: string;
  domain: string;
  years: number;
  payment_request: PaymentRequest;
}

export interface DomainInfo {
  domain_name: string;
  expires_at: string;
  nameservers: string[];
  registered_at: string;
}

export interface ConfirmResponse {
  status: string;
  domain?: DomainInfo;
  error?: string;
  mock_mode: boolean;
}

export interface DNSRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: string;
  prio?: string;
}

export interface AuthCodeResponse {
  domain: string;
  auth_code: string | null;
  message: string;
  manual_required?: boolean;
  instructions?: string[];
  dashboard_url?: string;
}

/**
 * Client for domain marketplace backend API
 */
export class DomainBackendClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || BACKEND_URL;
  }

  /**
   * Make an API request to the backend
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'POST',
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'DELETE')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error (${response.status}): ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Search for available domains
   */
  async searchDomains(query: string, tlds?: string[]): Promise<SearchResponse> {
    return this.request<SearchResponse>('/search', 'POST', {
      query,
      tlds: tlds || ['com', 'dev', 'io', 'app', 'xyz', 'co', 'org'],
    });
  }

  /**
   * Initiate a domain purchase
   */
  async initiatePurchase(params: {
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
  }): Promise<PurchaseResponse> {
    const registrant = {
      first_name: params.first_name,
      last_name: params.last_name,
      email: params.email,
      phone: params.phone || '+1.5551234567',
      address: params.address || '123 Main St',
      city: params.city || 'San Francisco',
      state: params.state || 'CA',
      zip_code: params.zip_code || '94102',
      country: params.country || 'US',
    };

    return this.request<PurchaseResponse>('/purchase/initiate', 'POST', {
      domain: params.domain,
      years: params.years || 1,
      registrant,
    });
  }

  /**
   * Confirm a domain purchase after payment
   */
  async confirmPurchase(purchaseId: string, txHash: string): Promise<ConfirmResponse> {
    return this.request<ConfirmResponse>('/purchase/confirm', 'POST', {
      purchase_id: purchaseId,
      tx_hash: txHash,
    });
  }

  /**
   * List domains owned by a wallet
   */
  async listDomains(wallet: string): Promise<{
    wallet: string;
    domains: DomainInfo[];
    total: number;
    mock_mode: boolean;
  }> {
    return this.request(`/domains?wallet=${encodeURIComponent(wallet)}`, 'GET');
  }

  /**
   * Get DNS records for a domain
   */
  async getDNSRecords(domain: string, wallet: string): Promise<{
    domain: string;
    records: DNSRecord[];
  }> {
    return this.request(`/domains/${domain}/dns?wallet=${wallet}`, 'GET');
  }

  /**
   * Create a DNS record
   */
  async createDNSRecord(params: {
    domain: string;
    wallet: string;
    record_type: string;
    name: string;
    content: string;
    ttl?: number;
  }): Promise<{
    status: string;
    domain: string;
    record_id: string;
    message: string;
  }> {
    return this.request('/domains/dns', 'POST', {
      domain: params.domain,
      wallet: params.wallet,
      record_type: params.record_type,
      name: params.name,
      content: params.content,
      ttl: params.ttl || 600,
    });
  }

  /**
   * Delete a DNS record
   */
  async deleteDNSRecord(params: {
    domain: string;
    wallet: string;
    record_id: string;
  }): Promise<{ status: string; message: string }> {
    return this.request('/domains/dns', 'DELETE', {
      domain: params.domain,
      wallet: params.wallet,
      record_id: params.record_id,
    });
  }

  /**
   * Update nameservers for a domain
   */
  async updateNameservers(params: {
    domain: string;
    wallet: string;
    nameservers: string[];
  }): Promise<{
    status: string;
    domain: string;
    nameservers: string[];
    message: string;
  }> {
    return this.request('/domains/nameservers', 'POST', {
      domain: params.domain,
      wallet: params.wallet,
      nameservers: params.nameservers,
    });
  }

  /**
   * Get auth/EPP code for domain transfer
   */
  async getAuthCode(domain: string, wallet: string): Promise<AuthCodeResponse> {
    return this.request(`/domains/${domain}/auth-code?wallet=${wallet}`, 'GET');
  }

  /**
   * Get backend URL
   */
  getBackendUrl(): string {
    return this.baseUrl;
  }
}

// Global client instance
export const domainClient = new DomainBackendClient();
