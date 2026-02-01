/**
 * Spending limits and validation
 */

import { ConfigManager } from '../config/manager.js';
import { TransactionHistory } from '../wallet/history.js';

export class SpendLimits {
  /**
   * Check if transaction amount is within max transaction limit
   */
  static async checkTransactionLimit(amount: number): Promise<{ valid: boolean; message?: string }> {
    const config = await ConfigManager.loadConfig();

    if (amount > config.security.maxTransactionAmount) {
      return {
        valid: false,
        message: `Transaction amount ($${amount}) exceeds maximum allowed ($${config.security.maxTransactionAmount})`
      };
    }

    return { valid: true };
  }

  /**
   * Check if transaction would exceed daily limit
   */
  static async checkDailyLimit(amount: number): Promise<{ valid: boolean; message?: string }> {
    const config = await ConfigManager.loadConfig();
    const dailySpend = await TransactionHistory.getDailySpend();
    const totalSpend = dailySpend + amount;

    if (totalSpend > config.security.dailyLimit) {
      return {
        valid: false,
        message: `Transaction would exceed daily limit. Spent today: $${dailySpend.toFixed(2)}, Limit: $${config.security.dailyLimit}`
      };
    }

    return { valid: true };
  }

  /**
   * Check if amount should be auto-approved
   */
  static async shouldAutoApprove(amount: number, service: string): Promise<boolean> {
    const config = await ConfigManager.loadConfig();
    return amount <= config.security.autoApproveUnder;
  }

  /**
   * Get daily spend total
   */
  static async getDailySpend(): Promise<number> {
    return await TransactionHistory.getDailySpend();
  }

  /**
   * Validate all limits for a transaction
   */
  static async validateTransaction(amount: number): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    const txLimit = await this.checkTransactionLimit(amount);
    if (!txLimit.valid && txLimit.message) {
      errors.push(txLimit.message);
    }

    const dailyLimit = await this.checkDailyLimit(amount);
    if (!dailyLimit.valid && dailyLimit.message) {
      errors.push(dailyLimit.message);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
