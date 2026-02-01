/**
 * Configuration manager
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { ClawdConfigSchema, type ClawdConfigType } from './schema.js';
import type { ClawdConfig } from '../types/index.js';

const CONFIG_FILE = join(homedir(), '.clawd', 'config.json');

export class ConfigManager {
  /**
   * Ensure config directory exists
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
   * Load configuration
   */
  static async loadConfig(): Promise<ClawdConfig> {
    try {
      await this.ensureDirectory();
      const data = await fs.readFile(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(data);

      // Validate with Zod
      return ClawdConfigSchema.parse(config);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('Configuration not found. Initialize wallet first with: clawd init');
      }
      throw new Error(`Failed to load configuration: ${(error as Error).message}`);
    }
  }

  /**
   * Save configuration
   */
  static async saveConfig(config: ClawdConfig): Promise<void> {
    try {
      // Validate with Zod
      ClawdConfigSchema.parse(config);

      await this.ensureDirectory();
      await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save configuration: ${(error as Error).message}`);
    }
  }

  /**
   * Update configuration (partial update)
   */
  static async updateConfig(updates: Partial<ClawdConfig>): Promise<void> {
    const currentConfig = await this.loadConfig();
    const newConfig = { ...currentConfig, ...updates };
    await this.saveConfig(newConfig);
  }

  /**
   * Initialize default configuration
   */
  static async initializeConfig(walletAddress: string): Promise<ClawdConfig> {
    const defaultConfig: ClawdConfig = {
      wallet: {
        address: walletAddress,
        network: 'base-mainnet',
        rpcUrl: 'https://mainnet.base.org',
        usdcContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
      },
      security: {
        maxTransactionAmount: 10.0, // $10 USDC max per transaction
        autoApproveUnder: 0.1, // Auto-approve under $0.10
        dailyLimit: 50.0 // $50 USDC per day
      },
      mcp: {
        enabled: true,
        logLevel: 'info'
      }
    };

    await this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  /**
   * Check if config exists
   */
  static async exists(): Promise<boolean> {
    try {
      await fs.access(CONFIG_FILE);
      return true;
    } catch {
      return false;
    }
  }
}
