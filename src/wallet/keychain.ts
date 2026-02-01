/**
 * Secure keychain integration using OS-native credential storage
 */

import keytar from 'keytar';

const SERVICE_NAME = 'clawd-wallet';
const ACCOUNT_NAME = 'base-mainnet';

export class Keychain {
  /**
   * Save private key to OS keychain
   * @param privateKey The private key to save
   * @param serviceName Optional service name (defaults to 'clawd-wallet')
   */
  static async savePrivateKey(privateKey: string, serviceName?: string): Promise<void> {
    try {
      const service = serviceName || SERVICE_NAME;
      await keytar.setPassword(service, ACCOUNT_NAME, privateKey);
    } catch (error) {
      throw new Error(`Failed to save private key to keychain: ${(error as Error).message}`);
    }
  }

  /**
   * Retrieve private key from OS keychain
   * @param serviceName Optional service name (defaults to 'clawd-wallet')
   */
  static async getPrivateKey(serviceName?: string): Promise<string | null> {
    try {
      const service = serviceName || SERVICE_NAME;
      return await keytar.getPassword(service, ACCOUNT_NAME);
    } catch (error) {
      throw new Error(`Failed to retrieve private key from keychain: ${(error as Error).message}`);
    }
  }

  /**
   * Delete private key from OS keychain
   * @param serviceName Optional service name (defaults to 'clawd-wallet')
   */
  static async deletePrivateKey(serviceName?: string): Promise<boolean> {
    try {
      const service = serviceName || SERVICE_NAME;
      return await keytar.deletePassword(service, ACCOUNT_NAME);
    } catch (error) {
      throw new Error(`Failed to delete private key from keychain: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a private key exists in the keychain
   * @param serviceName Optional service name (defaults to 'clawd-wallet')
   */
  static async hasPrivateKey(serviceName?: string): Promise<boolean> {
    try {
      const service = serviceName || SERVICE_NAME;
      const key = await keytar.getPassword(service, ACCOUNT_NAME);
      return key !== null;
    } catch (error) {
      return false;
    }
  }
}
