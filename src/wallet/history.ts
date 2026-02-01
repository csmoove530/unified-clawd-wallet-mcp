/**
 * Transaction history manager
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { Transaction } from '../types/index.js';

const HISTORY_FILE = join(homedir(), '.clawd', 'history.json');

export class TransactionHistory {
  /**
   * Ensure history directory exists
   */
  private static async ensureDirectory(): Promise<void> {
    const dir = join(homedir(), '.clawd');
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Load transaction history
   */
  static async load(): Promise<Transaction[]> {
    try {
      await this.ensureDirectory();
      const data = await fs.readFile(HISTORY_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, return empty array
      return [];
    }
  }

  /**
   * Save transaction history
   */
  private static async save(transactions: Transaction[]): Promise<void> {
    await this.ensureDirectory();
    await fs.writeFile(HISTORY_FILE, JSON.stringify(transactions, null, 2), 'utf-8');
  }

  /**
   * Add transaction to history
   */
  static async addTransaction(transaction: Transaction): Promise<void> {
    const history = await this.load();
    history.unshift(transaction); // Add to beginning

    // Keep only last 1000 transactions
    if (history.length > 1000) {
      history.splice(1000);
    }

    await this.save(history);
  }

  /**
   * Get transaction history with optional limit
   */
  static async getHistory(limit?: number): Promise<Transaction[]> {
    const history = await this.load();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get daily spending total
   */
  static async getDailySpend(): Promise<number> {
    const history = await this.load();
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    return history
      .filter(tx => tx.timestamp >= oneDayAgo && tx.status === 'success')
      .reduce((total, tx) => total + tx.amount, 0);
  }

  /**
   * Clear all history
   */
  static async clear(): Promise<void> {
    await this.save([]);
  }
}
