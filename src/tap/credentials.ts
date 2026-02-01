/**
 * TAP credentials storage and management
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { TAPCredentials, TAPAgentInfo, TAPAttestation, TAPStatus } from './types.js';
import { TAPKeychain } from './keychain.js';

const CLAWD_DIR = path.join(os.homedir(), '.clawd');
const TAP_DIR = path.join(CLAWD_DIR, 'tap');
const AGENT_FILE = path.join(TAP_DIR, 'agent.json');
const ATTESTATION_FILE = path.join(TAP_DIR, 'attestation.json');

export class TAPCredentialManager {
  /**
   * Ensure TAP directory exists
   */
  static async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(TAP_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Check if TAP is configured
   */
  static async isConfigured(): Promise<boolean> {
    try {
      await fs.access(AGENT_FILE);
      const hasKey = await TAPKeychain.hasPrivateKey();
      return hasKey;
    } catch {
      return false;
    }
  }

  /**
   * Check if identity is verified (has valid attestation)
   */
  static async isVerified(): Promise<boolean> {
    try {
      const attestation = await this.loadAttestation();
      if (!attestation) return false;

      // Check if attestation is expired
      const expiresAt = new Date(attestation.expiresAt);
      return expiresAt > new Date();
    } catch {
      return false;
    }
  }

  /**
   * Save agent registration info
   */
  static async saveAgent(agent: TAPAgentInfo, walletAddress: string, name: string, registryUrl: string): Promise<void> {
    await this.ensureDir();

    const agentData = {
      agentId: agent.agentId,
      walletAddress,
      name,
      keyId: agent.keyId,
      publicKey: agent.publicKey,
      registeredAt: agent.registeredAt,
      registryUrl
    };

    await fs.writeFile(AGENT_FILE, JSON.stringify(agentData, null, 2), { mode: 0o600 });
  }

  /**
   * Load agent info
   */
  static async loadAgent(): Promise<TAPAgentInfo & { walletAddress: string; name: string; registryUrl: string } | null> {
    try {
      const data = await fs.readFile(AGENT_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Save attestation
   */
  static async saveAttestation(attestation: TAPAttestation): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(ATTESTATION_FILE, JSON.stringify(attestation, null, 2), { mode: 0o600 });
  }

  /**
   * Load attestation
   */
  static async loadAttestation(): Promise<TAPAttestation | null> {
    try {
      const data = await fs.readFile(ATTESTATION_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Load full TAP credentials (for signing)
   */
  static async loadCredentials(): Promise<TAPCredentials | null> {
    const agent = await this.loadAgent();
    const attestation = await this.loadAttestation();
    const privateKeyHex = await TAPKeychain.getPrivateKey();

    if (!agent || !attestation || !privateKeyHex) {
      return null;
    }

    // Check if attestation is expired
    const expiresAt = new Date(attestation.expiresAt);
    if (expiresAt <= new Date()) {
      return null;
    }

    return {
      agentId: agent.agentId,
      walletAddress: agent.walletAddress,
      name: agent.name,
      keyId: agent.keyId,
      identityLevel: attestation.identityLevel,
      attestationJwt: attestation.attestationJwt,
      attestationExpires: attestation.expiresAt,
      registeredAt: agent.registeredAt,
      registryUrl: agent.registryUrl
    };
  }

  /**
   * Get TAP status for display
   */
  static async getStatus(): Promise<TAPStatus> {
    const isConfigured = await this.isConfigured();

    if (!isConfigured) {
      return { verified: false };
    }

    const agent = await this.loadAgent();
    const attestation = await this.loadAttestation();

    if (!agent) {
      return { verified: false };
    }

    if (!attestation) {
      return {
        verified: false,
        agentId: agent.agentId,
        registryUrl: agent.registryUrl
      };
    }

    // Check if attestation is expired
    const expiresAt = new Date(attestation.expiresAt);
    const isExpired = expiresAt <= new Date();

    return {
      verified: !isExpired,
      agentId: agent.agentId,
      identityLevel: attestation.identityLevel,
      attestationExpires: attestation.expiresAt,
      registryUrl: agent.registryUrl
    };
  }

  /**
   * Delete all TAP data
   */
  static async deleteAll(): Promise<void> {
    await TAPKeychain.deletePrivateKey();

    try {
      await fs.rm(TAP_DIR, { recursive: true });
    } catch {
      // Directory might not exist
    }
  }
}
