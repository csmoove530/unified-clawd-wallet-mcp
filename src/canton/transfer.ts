/**
 * Canton CIP-56 transfer implementation
 *
 * Creates, signs, and submits transfer instructions to the Canton ledger.
 */

import { CantonClient } from './client.js';
import { HoldingsManager } from './holdings.js';
import {
  type CantonConfig,
  type CantonTransferResult,
  type CantonTransferInstruction,
  CANTON_COIN,
} from './types.js';

/**
 * Handle Canton token transfers
 */
export class TransferManager {
  private client: CantonClient;
  private holdings: HoldingsManager;
  private config: CantonConfig;

  constructor(config: CantonConfig) {
    this.config = config;
    this.client = new CantonClient(config);
    this.holdings = new HoldingsManager(config);
  }

  /**
   * Initialize the transfer manager
   */
  async initialize(): Promise<void> {
    await this.client.initialize();
  }

  /**
   * Execute a token transfer
   *
   * @param recipient - Recipient party ID
   * @param amount - Amount to transfer (as string, in base units)
   * @param tokenId - Token ID (defaults to Canton Coin)
   */
  async transfer(
    recipient: string,
    amount: string,
    tokenId: string = CANTON_COIN.tokenId
  ): Promise<CantonTransferResult> {
    try {
      await this.initialize();

      // Validate recipient format
      if (!this.isValidPartyId(recipient)) {
        return {
          success: false,
          transferId: '',
          recipient,
          amount,
          tokenSymbol: this.getTokenSymbol(tokenId),
          status: 'failed',
          timestamp: Date.now(),
          error: 'Invalid recipient party ID format',
        };
      }

      // Check sufficient balance
      const hasFunds = await this.holdings.hasSufficientBalance(tokenId, amount);
      if (!hasFunds) {
        return {
          success: false,
          transferId: '',
          recipient,
          amount,
          tokenSymbol: this.getTokenSymbol(tokenId),
          status: 'failed',
          timestamp: Date.now(),
          error: 'Insufficient balance for transfer',
        };
      }

      // Create transfer instruction
      const instruction = await this.client.createTransfer(recipient, amount, tokenId);

      // Submit to ledger
      const result = await this.client.submitTransfer(instruction);

      if (!result.success) {
        return {
          success: false,
          transferId: result.transferId || '',
          recipient,
          amount,
          tokenSymbol: this.getTokenSymbol(tokenId),
          status: 'failed',
          timestamp: Date.now(),
          error: result.error || 'Transfer submission failed',
        };
      }

      // Track successful transfer
      await this.trackTransfer(instruction, result.transferId);

      return {
        success: true,
        transferId: result.transferId,
        recipient,
        amount,
        tokenSymbol: this.getTokenSymbol(tokenId),
        status: 'pending', // Will be confirmed by ledger
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        transferId: '',
        recipient,
        amount,
        tokenSymbol: this.getTokenSymbol(tokenId),
        status: 'failed',
        timestamp: Date.now(),
        error: (error as Error).message,
      };
    }
  }

  /**
   * Transfer Canton Coin (CC)
   *
   * @param recipient - Recipient party ID
   * @param amount - Amount in CC (e.g., "10.5" for 10.5 CC)
   */
  async transferCC(recipient: string, amount: string): Promise<CantonTransferResult> {
    // Convert human-readable amount to base units (6 decimals)
    const baseUnits = this.parseAmount(amount, CANTON_COIN.decimals);
    return this.transfer(recipient, baseUnits, CANTON_COIN.tokenId);
  }

  /**
   * Parse human-readable amount to base units
   */
  private parseAmount(amount: string, decimals: number): string {
    const parts = amount.split('.');
    const integerPart = parts[0] || '0';
    let fractionalPart = parts[1] || '';

    // Pad or truncate fractional part
    if (fractionalPart.length < decimals) {
      fractionalPart = fractionalPart.padEnd(decimals, '0');
    } else if (fractionalPart.length > decimals) {
      fractionalPart = fractionalPart.slice(0, decimals);
    }

    const combined = integerPart + fractionalPart;
    // Remove leading zeros but keep at least one digit
    return combined.replace(/^0+/, '') || '0';
  }

  /**
   * Format base units to human-readable amount
   */
  formatAmount(baseUnits: string, decimals: number = CANTON_COIN.decimals): string {
    const value = BigInt(baseUnits);
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    // Trim trailing zeros from fractional part
    const trimmedFractional = fractionalStr.replace(/0+$/, '');

    if (trimmedFractional) {
      return `${integerPart}.${trimmedFractional}`;
    }
    return integerPart.toString();
  }

  /**
   * Validate party ID format
   */
  private isValidPartyId(partyId: string): boolean {
    // Canton party IDs are typically formatted as:
    // - participant::namespace::identifier
    // - Or a hex string for DevNet
    if (!partyId || partyId.length < 3) {
      return false;
    }

    // Allow various formats for DevNet flexibility
    return /^[a-zA-Z0-9:_-]+$/.test(partyId);
  }

  /**
   * Get token symbol from token ID
   */
  private getTokenSymbol(tokenId: string): string {
    if (tokenId === CANTON_COIN.tokenId) {
      return CANTON_COIN.symbol;
    }
    // Extract symbol from token ID if possible
    const parts = tokenId.split('-');
    return parts[0]?.toUpperCase() || 'TOKEN';
  }

  /**
   * Track a submitted transfer (for history)
   */
  private async trackTransfer(
    instruction: CantonTransferInstruction,
    transferId: string
  ): Promise<void> {
    // This would integrate with transaction history storage
    // For now, just log the transfer
    console.error(`[Canton] Transfer ${transferId} submitted: ${instruction.amount} to ${instruction.recipient}`);
  }

  /**
   * Get transfer status
   */
  async getTransferStatus(transferId: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed';
    confirmations?: number;
  }> {
    // Query ledger for transfer status
    // For DevNet, simulate confirmed status
    if (this.config.network === 'devnet') {
      return {
        status: 'confirmed',
        confirmations: 1,
      };
    }

    // In production, would query the ledger
    return {
      status: 'pending',
    };
  }
}
