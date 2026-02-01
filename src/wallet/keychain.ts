/**
 * Secure keychain integration using OS-native credential storage
 */

import keytar from 'keytar';

const SERVICE_NAME = 'clawd-wallet';
const ACCOUNT_NAME = 'base-mainnet';

export class Keychain {
  /**
   * Save private key to OS keychain
   */
  static async savePrivateKey(privateKey: string): Promise<void> {
    try {
      await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, privateKey);
    } catch (error) {
      throw new Error(`Failed to save private key to keychain: ${(error as Error).message}`);
    }
  }

  /**
   * Retrieve private key from OS keychain
   */
  static async getPrivateKey(): Promise<string | null> {
    try {
      return await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    } catch (error) {
      throw new Error(`Failed to retrieve private key from keychain: ${(error as Error).message}`);
    }
  }

  /**
   * Delete private key from OS keychain
   */
  static async deletePrivateKey(): Promise<boolean> {
    try {
      return await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    } catch (error) {
      throw new Error(`Failed to delete private key from keychain: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a private key exists in the keychain
   */
  static async hasPrivateKey(): Promise<boolean> {
    try {
      const key = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      return key !== null;
    } catch (error) {
      return false;
    }
  }
}
