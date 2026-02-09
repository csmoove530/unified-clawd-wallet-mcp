/**
 * Canton party credentials storage using OS keychain
 */

import keytar from 'keytar';

const SERVICE_NAME = 'clawd-canton';
const PARTY_ACCOUNT = 'party-credentials';

export interface CantonCredentials {
  partyId: string;
  displayName: string;
  authToken?: string;
  hmacSecret?: string;
  createdAt: number;
}

export class CantonKeychain {
  /**
   * Save Canton party credentials to OS keychain
   */
  static async saveCredentials(credentials: CantonCredentials): Promise<void> {
    try {
      const data = JSON.stringify(credentials);
      await keytar.setPassword(SERVICE_NAME, PARTY_ACCOUNT, data);
    } catch (error) {
      throw new Error(`Failed to save Canton credentials: ${(error as Error).message}`);
    }
  }

  /**
   * Retrieve Canton party credentials from OS keychain
   */
  static async getCredentials(): Promise<CantonCredentials | null> {
    try {
      const data = await keytar.getPassword(SERVICE_NAME, PARTY_ACCOUNT);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as CantonCredentials;
    } catch (error) {
      throw new Error(`Failed to retrieve Canton credentials: ${(error as Error).message}`);
    }
  }

  /**
   * Delete Canton party credentials from OS keychain
   */
  static async deleteCredentials(): Promise<boolean> {
    try {
      return await keytar.deletePassword(SERVICE_NAME, PARTY_ACCOUNT);
    } catch (error) {
      throw new Error(`Failed to delete Canton credentials: ${(error as Error).message}`);
    }
  }

  /**
   * Check if Canton credentials exist in keychain
   */
  static async hasCredentials(): Promise<boolean> {
    try {
      const data = await keytar.getPassword(SERVICE_NAME, PARTY_ACCOUNT);
      return data !== null;
    } catch {
      return false;
    }
  }

  /**
   * Update specific fields of Canton credentials
   */
  static async updateCredentials(updates: Partial<CantonCredentials>): Promise<void> {
    const current = await this.getCredentials();
    if (!current) {
      throw new Error('No Canton credentials found to update');
    }

    const updated: CantonCredentials = {
      ...current,
      ...updates,
    };

    await this.saveCredentials(updated);
  }
}
