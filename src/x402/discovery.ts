/**
 * x402 service discovery
 *
 * Supports both API-based registry discovery and local fallback.
 * Configure with X402_REGISTRY_URL environment variable.
 */

import type { X402Service } from '../types/index.js';

/**
 * Default registry API endpoint (Coinbase CDP Bazaar)
 * Set X402_REGISTRY_URL environment variable to use a custom registry
 */
const DEFAULT_REGISTRY_URL = 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources';
const REGISTRY_URL = process.env.X402_REGISTRY_URL || DEFAULT_REGISTRY_URL;

/**
 * Bazaar API response types
 */
interface BazaarPaymentRequirement {
  scheme: string;
  amount?: string;
  maxAmountRequired?: string;
  asset: string;
  network: string;
  payTo: string;
  description?: string;
  extra?: {
    name?: string;
    version?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface BazaarResource {
  resource: string;
  type: string;
  x402Version: number;
  accepts: BazaarPaymentRequirement[];
  lastUpdated: string;
  metadata: {
    description?: string;
    category?: string;
    name?: string;
    [key: string]: any;
  };
}

interface BazaarResponse {
  x402Version: number;
  items: BazaarResource[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

/**
 * Fallback list of known x402 services
 * Used when registry API is unavailable
 */
const FALLBACK_SERVICES: X402Service[] = [
  {
    name: 'Weather API',
    url: 'https://api.example.com/weather',
    description: 'Real-time weather data',
    pricing: {
      currency: 'USDC',
      amount: 0.01,
      per: 'request'
    },
    category: 'data'
  },
  {
    name: 'AI Image Generation',
    url: 'https://api.example.com/generate-image',
    description: 'Generate images from text',
    pricing: {
      currency: 'USDC',
      amount: 0.05,
      per: 'image'
    },
    category: 'ai'
  },
  {
    name: 'Code Analysis',
    url: 'https://api.example.com/analyze-code',
    description: 'Analyze code quality and security',
    pricing: {
      currency: 'USDC',
      amount: 0.02,
      per: 'analysis'
    },
    category: 'developer-tools'
  }
];

export class ServiceDiscovery {
  /**
   * Discover x402 services from registry API
   * Falls back to local services if API is unavailable
   */
  static async discoverServices(
    query?: string,
    category?: string
  ): Promise<X402Service[]> {
    try {
      // Try to fetch from registry API
      const services = await this.fetchFromRegistry(query, category);
      return services;
    } catch (error) {
      // Fall back to local services if API fails
      console.warn(`Registry API unavailable (${REGISTRY_URL}), using fallback services`);
      return this.filterLocalServices(query, category);
    }
  }

  /**
   * Fetch services from Bazaar discovery API
   */
  private static async fetchFromRegistry(
    query?: string,
    category?: string
  ): Promise<X402Service[]> {
    const params = new URLSearchParams();
    params.append('type', 'http'); // Required parameter for Bazaar API
    params.append('limit', '100'); // Get up to 100 results per request

    const url = `${REGISTRY_URL}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'clawd-wallet/1.0.0'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout for Bazaar API
    });

    if (!response.ok) {
      throw new Error(`Bazaar API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as BazaarResponse;

    // Transform Bazaar items to X402Service format
    let services = data.items.map(item => this.transformBazaarItem(item));

    // Apply client-side filtering for query and category
    if (query) {
      const lowerQuery = query.toLowerCase();
      services = services.filter(s =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.description.toLowerCase().includes(lowerQuery) ||
        s.url.toLowerCase().includes(lowerQuery)
      );
    }

    if (category) {
      services = services.filter(s => s.category.toLowerCase() === category.toLowerCase());
    }

    return services;
  }

  /**
   * Transform a Bazaar resource item to X402Service format
   */
  private static transformBazaarItem(item: BazaarResource): X402Service {
    // Get the first payment requirement (most common case)
    const paymentReq = item.accepts && item.accepts.length > 0 ? item.accepts[0] : null;

    // Extract description from payment requirement or metadata
    const description = paymentReq?.description ||
                      item.metadata?.description ||
                      'x402-enabled service';

    // Derive name from URL domain or use metadata/extra name
    const name = this.deriveServiceName(item.resource, paymentReq?.extra?.name, item.metadata?.name);

    // Extract pricing information
    const pricing = this.extractPricing(paymentReq);

    // Derive category from metadata or description
    const category = item.metadata?.category ||
                    this.deriveCategory(description, item.resource) ||
                    'general';

    return {
      name,
      url: item.resource,
      description,
      pricing,
      category
    };
  }

  /**
   * Derive service name from URL, extra name, or metadata
   */
  private static deriveServiceName(url: string, extraName?: string, metadataName?: string): string {
    if (metadataName) return metadataName;
    if (extraName && extraName !== 'USD Coin') return extraName;

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      // Remove 'www.' and 'api.' prefixes, then take the domain
      const domain = hostname.replace(/^(www\.|api\.)/, '').split('.')[0];
      return domain || hostname;
    } catch {
      return url;
    }
  }

  /**
   * Extract pricing information from payment requirement
   */
  private static extractPricing(paymentReq: BazaarPaymentRequirement | null): X402Service['pricing'] {
    if (!paymentReq) {
      return {
        currency: 'USDC',
        amount: 0,
        per: 'request'
      };
    }

    // Determine currency name
    const currencyName = paymentReq.extra?.name === 'USD Coin'
      ? 'USDC'
      : paymentReq.extra?.name || 'USDC';

    // Extract amount (handle both 'amount' and 'maxAmountRequired')
    const amountStr = paymentReq.amount || paymentReq.maxAmountRequired || '0';
    const amount = parseFloat(amountStr);

    // Convert from smallest unit to readable format
    // Most tokens use 6 decimals (USDC), but we'll try to detect
    // Common patterns: amounts like "10000" are typically 0.01 USDC (6 decimals)
    // Amounts like "100000" could be 0.1 USDC (6 decimals) or 0.0001 (9 decimals)
    // For now, assume 6 decimals for USDC-like tokens
    const decimals = currencyName === 'USDC' ? 6 : 6; // Default to 6 decimals
    const readableAmount = amount / Math.pow(10, decimals);

    return {
      currency: currencyName,
      amount: readableAmount,
      per: 'request'
    };
  }

  /**
   * Derive category from description or URL
   */
  private static deriveCategory(description: string, url: string): string | null {
    const lowerDesc = description.toLowerCase();
    const lowerUrl = url.toLowerCase();

    // Category keywords
    if (lowerDesc.includes('weather') || lowerDesc.includes('climate')) return 'data';
    if (lowerDesc.includes('image') || lowerDesc.includes('generate') || lowerDesc.includes('ai')) return 'ai';
    if (lowerDesc.includes('code') || lowerDesc.includes('analyze') || lowerDesc.includes('developer')) return 'developer-tools';
    if (lowerDesc.includes('news') || lowerDesc.includes('article')) return 'news';
    if (lowerDesc.includes('search') || lowerDesc.includes('discover')) return 'search';
    if (lowerDesc.includes('token') || lowerDesc.includes('crypto') || lowerDesc.includes('blockchain')) return 'crypto';
    if (lowerDesc.includes('anonymize') || lowerDesc.includes('privacy')) return 'privacy';

    return null;
  }

  /**
   * Filter local fallback services
   */
  private static filterLocalServices(
    query?: string,
    category?: string
  ): X402Service[] {
    let services = [...FALLBACK_SERVICES];

    // Filter by category
    if (category) {
      services = services.filter(s => s.category === category);
    }

    // Filter by query
    if (query) {
      const lowerQuery = query.toLowerCase();
      services = services.filter(s =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.description.toLowerCase().includes(lowerQuery)
      );
    }

    return services;
  }

  /**
   * Get all available categories
   * Extracts unique categories from discovered services
   */
  static async getCategories(): Promise<string[]> {
    try {
      // Fetch services and extract unique categories
      const services = await this.fetchFromRegistry();
      const categories = new Set(services.map(s => s.category));
      const categoryArray = Array.from(categories).sort();

      // If we got categories from API, return them
      if (categoryArray.length > 0) {
        return categoryArray;
      }
    } catch (error) {
      // Fall back to local categories
    }

    // Fallback to local categories
    const categories = new Set(FALLBACK_SERVICES.map(s => s.category));
    return Array.from(categories).sort();
  }

  /**
   * Get service by URL
   * Searches Bazaar API and filters by resource URL
   */
  static async getServiceByUrl(url: string): Promise<X402Service | null> {
    try {
      // Fetch services and filter by URL
      const services = await this.fetchFromRegistry();
      const service = services.find(s => s.url === url);

      if (service) {
        return service;
      }
    } catch (error) {
      // Fall back to local lookup
    }

    // Fallback to local lookup
    return FALLBACK_SERVICES.find(s => s.url === url) || null;
  }

  /**
   * Get the configured registry URL
   */
  static getRegistryUrl(): string {
    return REGISTRY_URL;
  }

  /**
   * Check if using default registry (Bazaar API)
   */
  static isUsingDefaultRegistry(): boolean {
    return REGISTRY_URL === DEFAULT_REGISTRY_URL;
  }
}
