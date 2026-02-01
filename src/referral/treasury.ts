/**
 * Treasury wallet management for referral payouts
 */

import { ethers } from 'ethers';
import { Keychain } from '../wallet/keychain.js';

// USDC contract ABI (minimal for transfers)
const USDC_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Base mainnet configuration
const BASE_CONFIG = {
  chainId: 8453,
  rpcUrl: 'https://mainnet.base.org',
  usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  explorerUrl: 'https://basescan.org'
};

export interface TransferResult {
  success: boolean;
  txHash: string | null;
  error?: string;
  gasUsed?: string;
  blockNumber?: number;
}

export class Treasury {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | null = null;
  private usdcContract: ethers.Contract | null = null;

  constructor(privateKey?: string) {
    this.provider = new ethers.JsonRpcProvider(BASE_CONFIG.rpcUrl);

    if (privateKey) {
      this.initializeWallet(privateKey);
    }
  }

  /**
   * Initialize wallet with private key
   */
  initializeWallet(privateKey: string): void {
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.usdcContract = new ethers.Contract(
      BASE_CONFIG.usdcAddress,
      USDC_ABI,
      this.wallet
    );
  }

  /**
   * Load treasury wallet from environment or keychain
   */
  async loadFromEnvOrKeychain(): Promise<boolean> {
    // First try environment variable
    const envKey = process.env.CLAWD_TREASURY_PRIVATE_KEY;
    if (envKey) {
      this.initializeWallet(envKey);
      return true;
    }

    // Try loading from keychain with treasury-specific key
    try {
      const treasuryKey = await Keychain.getPrivateKey('clawd-treasury');
      if (treasuryKey) {
        this.initializeWallet(treasuryKey);
        return true;
      }
    } catch {
      // Keychain not available or no key stored
    }

    return false;
  }

  /**
   * Save treasury private key to keychain
   */
  async saveToKeychain(privateKey: string): Promise<void> {
    await Keychain.savePrivateKey(privateKey, 'clawd-treasury');
    this.initializeWallet(privateKey);
  }

  /**
   * Get treasury wallet address
   */
  getAddress(): string | null {
    return this.wallet?.address || null;
  }

  /**
   * Check if treasury is initialized
   */
  isInitialized(): boolean {
    return this.wallet !== null;
  }

  /**
   * Get treasury USDC balance
   */
  async getBalance(): Promise<{ balance: string; raw: bigint }> {
    if (!this.usdcContract || !this.wallet) {
      throw new Error('Treasury wallet not initialized');
    }

    const balance = await this.usdcContract.balanceOf(this.wallet.address);
    const decimals = await this.usdcContract.decimals();

    return {
      balance: ethers.formatUnits(balance, decimals),
      raw: balance
    };
  }

  /**
   * Check if treasury has sufficient balance for a payout
   */
  async hasSufficientBalance(amount: number): Promise<boolean> {
    try {
      const { balance } = await this.getBalance();
      return parseFloat(balance) >= amount;
    } catch {
      return false;
    }
  }

  /**
   * Transfer USDC to a recipient
   */
  async transfer(recipientAddress: string, amount: number): Promise<TransferResult> {
    if (!this.wallet || !this.usdcContract) {
      return {
        success: false,
        txHash: null,
        error: 'Treasury wallet not initialized'
      };
    }

    // Validate recipient address
    if (!ethers.isAddress(recipientAddress)) {
      return {
        success: false,
        txHash: null,
        error: 'Invalid recipient address'
      };
    }

    try {
      // Check balance first
      const hasBalance = await this.hasSufficientBalance(amount);
      if (!hasBalance) {
        return {
          success: false,
          txHash: null,
          error: 'Insufficient treasury balance'
        };
      }

      // Convert amount to USDC units (6 decimals)
      const decimals = await this.usdcContract.decimals();
      const amountInUnits = ethers.parseUnits(amount.toString(), decimals);

      // Estimate gas
      const gasEstimate = await this.usdcContract.transfer.estimateGas(
        recipientAddress,
        amountInUnits
      );

      // Send transaction with some buffer on gas
      const tx = await this.usdcContract.transfer(
        recipientAddress,
        amountInUnits,
        {
          gasLimit: gasEstimate * 120n / 100n // 20% buffer
        }
      );

      // Wait for confirmation
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        txHash: null,
        error: `Transfer failed: ${errorMessage}`
      };
    }
  }

  /**
   * Get transaction explorer URL
   */
  static getExplorerUrl(txHash: string): string {
    return `${BASE_CONFIG.explorerUrl}/tx/${txHash}`;
  }

  /**
   * Get address explorer URL
   */
  static getAddressExplorerUrl(address: string): string {
    return `${BASE_CONFIG.explorerUrl}/address/${address}`;
  }

  /**
   * Generate a new treasury wallet (for initial setup)
   */
  static generateNewWallet(): { address: string; privateKey: string } {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  }
}
