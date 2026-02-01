/**
 * Wallet manager for creating and managing Ethereum wallets
 */

import { ethers } from 'ethers';
import { Keychain } from './keychain.js';

export class WalletManager {
  private wallet: ethers.HDNodeWallet | ethers.Wallet | null = null;

  /**
   * Generate a new wallet
   */
  generateWallet(): ethers.HDNodeWallet {
    this.wallet = ethers.Wallet.createRandom();
    return this.wallet;
  }

  /**
   * Save wallet private key to keychain
   */
  async saveToKeychain(): Promise<void> {
    if (!this.wallet) {
      throw new Error('No wallet to save. Generate or load a wallet first.');
    }
    await Keychain.savePrivateKey(this.wallet.privateKey);
  }

  /**
   * Load wallet from keychain
   */
  async loadFromKeychain(): Promise<ethers.Wallet> {
    const privateKey = await Keychain.getPrivateKey();
    if (!privateKey) {
      throw new Error('No wallet found in keychain. Initialize wallet first with: clawd init');
    }
    this.wallet = new ethers.Wallet(privateKey);
    return this.wallet;
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    if (!this.wallet) {
      throw new Error('No wallet loaded. Load wallet first.');
    }
    return this.wallet.address;
  }

  /**
   * Get current wallet instance
   */
  getWallet(): ethers.HDNodeWallet | ethers.Wallet {
    if (!this.wallet) {
      throw new Error('No wallet loaded. Load wallet first.');
    }
    return this.wallet;
  }

  /**
   * Export private key (use with caution)
   */
  async exportPrivateKey(): Promise<string> {
    if (!this.wallet) {
      await this.loadFromKeychain();
    }
    if (!this.wallet) {
      throw new Error('No wallet available to export');
    }
    return this.wallet.privateKey;
  }

  /**
   * Create wallet from existing private key
   */
  importWallet(privateKey: string): ethers.Wallet {
    this.wallet = new ethers.Wallet(privateKey);
    return this.wallet;
  }
}
