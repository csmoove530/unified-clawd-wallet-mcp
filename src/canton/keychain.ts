/**
 * Canton party credentials storage using OS keychain.
 * Stores party ID and Ed25519 private key for external party signing.
 */

import keytar from 'keytar';

const SERVICE_NAME = 'clawd-canton';
const PARTY_ACCOUNT = 'party-credentials';

export interface CantonCredentials {
  partyId: string;
  displayName: string;
  /** Base64-encoded Ed25519 private key for signing (external party). */
  privateKey: string;
  createdAt: number;
}

export class CantonKeychain {
  static async saveCredentials(credentials: CantonCredentials): Promise<void> {
    try {
      const data = JSON.stringify(credentials);
      await keytar.setPassword(SERVICE_NAME, PARTY_ACCOUNT, data);
    } catch (error) {
      throw new Error(`Failed to save Canton credentials: ${(error as Error).message}`);
    }
  }

  static async getCredentials(): Promise<CantonCredentials | null> {
    try {
      const data = await keytar.getPassword(SERVICE_NAME, PARTY_ACCOUNT);
      if (!data) return null;
      return JSON.parse(data) as CantonCredentials;
    } catch (error) {
      throw new Error(`Failed to retrieve Canton credentials: ${(error as Error).message}`);
    }
  }

  static async deleteCredentials(): Promise<boolean> {
    try {
      return await keytar.deletePassword(SERVICE_NAME, PARTY_ACCOUNT);
    } catch (error) {
      throw new Error(`Failed to delete Canton credentials: ${(error as Error).message}`);
    }
  }

  static async hasCredentials(): Promise<boolean> {
    try {
      const data = await keytar.getPassword(SERVICE_NAME, PARTY_ACCOUNT);
      return data !== null;
    } catch {
      return false;
    }
  }
}
