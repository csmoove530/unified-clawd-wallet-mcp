/**
 * Canton token holdings queries (CIP-56 compliant)
 */

import { CantonClient } from './client.js';
import {
  type CantonConfig,
  type CantonHolding,
  type CantonHoldingsResult,
  CANTON_COIN,
} from './types.js';

/**
 * Query and manage Canton token holdings
 */
export class HoldingsManager {
  private client: CantonClient;
  private config: CantonConfig;

  constructor(config: CantonConfig) {
    this.config = config;
    this.client = new CantonClient(config);
  }

  /**
   * Initialize the holdings manager
   */
  async initialize(): Promise<void> {
    await this.client.initialize();
  }

  /**
   * Get all token holdings for the configured party
   */
  async getHoldings(): Promise<CantonHoldingsResult> {
    try {
      await this.initialize();

      const holdings = await this.client.getHoldings();
      const partyId = this.client.getPartyId();

      return {
        success: true,
        partyId,
        network: this.config.network,
        holdings,
        totalHoldings: holdings.length,
      };
    } catch (error) {
      return {
        success: false,
        partyId: this.config.partyId || 'unknown',
        network: this.config.network,
        holdings: [],
        totalHoldings: 0,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get holding for a specific token
   */
  async getHolding(tokenId: string): Promise<CantonHolding | null> {
    const result = await this.getHoldings();
    if (!result.success) {
      return null;
    }

    return result.holdings.find((h) => h.tokenId === tokenId) || null;
  }

  /**
   * Get Canton Coin (CC) holding
   */
  async getCantonCoinHolding(): Promise<CantonHolding | null> {
    return this.getHolding(CANTON_COIN.tokenId);
  }

  /**
   * Check if party has sufficient balance for a transfer
   */
  async hasSufficientBalance(tokenId: string, amount: string): Promise<boolean> {
    const holding = await this.getHolding(tokenId);
    if (!holding) {
      return false;
    }

    const holdingAmount = BigInt(holding.amount);
    const requiredAmount = BigInt(amount);

    return holdingAmount >= requiredAmount;
  }

  /**
   * Format holdings for display
   */
  formatHoldings(holdings: CantonHolding[]): string {
    if (holdings.length === 0) {
      return 'No holdings found';
    }

    const lines: string[] = ['Token Holdings:', ''];

    for (const holding of holdings) {
      const formattedAmount = this.formatAmount(holding.amount, holding.symbol);
      lines.push(`  ${holding.symbol}: ${formattedAmount}`);
      lines.push(`    Token ID: ${holding.tokenId}`);
      lines.push(`    Registry: ${holding.registry}`);
      lines.push(`    UTXOs: ${holding.utxoCount}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format amount with proper decimals
   */
  private formatAmount(amount: string, symbol: string): string {
    // Canton Coin uses 6 decimals
    const decimals = symbol === CANTON_COIN.symbol ? CANTON_COIN.decimals : 6;
    const value = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    return `${integerPart}.${fractionalStr} ${symbol}`;
  }
}
