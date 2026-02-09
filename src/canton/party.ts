/**
 * Canton party management and information
 */

import { CantonClient } from './client.js';
import { CantonKeychain, type CantonCredentials } from './keychain.js';
import {
  type CantonConfig,
  type CantonPartyInfo,
  type CantonConfigureResult,
  CANTON_DEVNET_ENDPOINTS,
} from './types.js';

/**
 * Manage Canton party configuration and information
 */
export class PartyManager {
  private config: CantonConfig;

  constructor(config: CantonConfig) {
    this.config = config;
  }

  /**
   * Configure Canton with a party ID
   */
  async configure(
    partyId: string,
    options: {
      displayName?: string;
      authToken?: string;
      hmacSecret?: string;
      validatorUrl?: string;
      ledgerApiUrl?: string;
    } = {}
  ): Promise<CantonConfigureResult> {
    try {
      // Validate party ID format
      if (!this.isValidPartyId(partyId)) {
        return {
          success: false,
          error: 'Invalid party ID format. Party ID must be alphanumeric with colons, underscores, or dashes.',
        };
      }

      // Determine URLs based on network
      const validatorUrl = options.validatorUrl ||
        (this.config.network === 'devnet' ? CANTON_DEVNET_ENDPOINTS.validatorUrl : undefined);
      const ledgerApiUrl = options.ledgerApiUrl ||
        (this.config.network === 'devnet' ? CANTON_DEVNET_ENDPOINTS.ledgerApiUrl : undefined);

      // Create credentials
      const credentials: CantonCredentials = {
        partyId,
        displayName: options.displayName || `Canton Party (${partyId.slice(0, 8)})`,
        authToken: options.authToken,
        hmacSecret: options.hmacSecret,
        createdAt: Date.now(),
      };

      // Save to keychain
      await CantonKeychain.saveCredentials(credentials);

      // Test connection
      const testConfig: CantonConfig = {
        ...this.config,
        enabled: true,
        partyId,
        displayName: credentials.displayName,
        validatorUrl,
        ledgerApiUrl,
      };

      const client = new CantonClient(testConfig);
      const connectionTest = await client.testConnection();

      return {
        success: true,
        partyId,
        network: this.config.network,
        validatorUrl,
        ledgerApiUrl,
        message: connectionTest.success
          ? `Canton configured successfully. ${connectionTest.message}`
          : `Canton configured. Warning: ${connectionTest.message}`,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get current party information
   */
  async getPartyInfo(): Promise<{
    success: boolean;
    partyInfo?: CantonPartyInfo;
    error?: string;
  }> {
    try {
      if (!this.config.enabled || !this.config.partyId) {
        return {
          success: false,
          error: 'Canton not configured. Use canton_configure to set up your party ID.',
        };
      }

      const client = new CantonClient(this.config);
      await client.initialize();

      const partyInfo = await client.getPartyInfo();

      return {
        success: true,
        partyInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Check if Canton is configured
   */
  async isConfigured(): Promise<boolean> {
    if (!this.config.enabled || !this.config.partyId) {
      return false;
    }

    return await CantonKeychain.hasCredentials();
  }

  /**
   * Get current credentials (for internal use)
   */
  async getCredentials(): Promise<CantonCredentials | null> {
    return await CantonKeychain.getCredentials();
  }

  /**
   * Clear Canton configuration
   */
  async clearConfiguration(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const deleted = await CantonKeychain.deleteCredentials();

      return {
        success: true,
        message: deleted
          ? 'Canton configuration cleared successfully'
          : 'No Canton configuration to clear',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Validate party ID format
   */
  private isValidPartyId(partyId: string): boolean {
    if (!partyId || partyId.length < 3) {
      return false;
    }
    // Allow alphanumeric, colons (for namespacing), underscores, and dashes
    return /^[a-zA-Z0-9:_-]+$/.test(partyId);
  }

  /**
   * Generate a display name from party ID if not provided
   */
  generateDisplayName(partyId: string): string {
    // Extract meaningful part from party ID
    const parts = partyId.split('::');
    const identifier = parts[parts.length - 1] || partyId;

    if (identifier.length > 16) {
      return `Canton Party (${identifier.slice(0, 8)}...${identifier.slice(-4)})`;
    }

    return `Canton Party (${identifier})`;
  }
}
