/**
 * TAP key management using OS keychain
 */

import keytar from 'keytar';

const SERVICE_NAME = 'clawd-wallet';
const TAP_ACCOUNT_NAME = 'tap-signing-key';

export class TAPKeychain {
  /**
   * Save TAP Ed25519 private key to OS keychain
   */
  static async savePrivateKey(privateKeyHex: string): Promise<void> {
    try {
      await keytar.setPassword(SERVICE_NAME, TAP_ACCOUNT_NAME, privateKeyHex);
    } catch (error) {
      throw new Error(`Failed to save TAP key to keychain: ${(error as Error).message}`);
    }
  }

  /**
   * Retrieve TAP private key from OS keychain
   */
  static async getPrivateKey(): Promise<string | null> {
    try {
      return await keytar.getPassword(SERVICE_NAME, TAP_ACCOUNT_NAME);
    } catch (error) {
      throw new Error(`Failed to retrieve TAP key from keychain: ${(error as Error).message}`);
    }
  }

  /**
   * Delete TAP private key from OS keychain
   */
  static async deletePrivateKey(): Promise<boolean> {
    try {
      return await keytar.deletePassword(SERVICE_NAME, TAP_ACCOUNT_NAME);
    } catch (error) {
      throw new Error(`Failed to delete TAP key from keychain: ${(error as Error).message}`);
    }
  }

  /**
   * Check if TAP private key exists
   */
  static async hasPrivateKey(): Promise<boolean> {
    try {
      const key = await keytar.getPassword(SERVICE_NAME, TAP_ACCOUNT_NAME);
      return key !== null;
    } catch (error) {
      return false;
    }
  }
}
