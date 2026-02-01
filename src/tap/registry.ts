/**
 * TAP Registry API client
 *
 * Supports mock mode for demos when no real registry is available.
 * Set CLAWD_TAP_MOCK_MODE=true to enable mock mode.
 */

import { ethers } from 'ethers';
import * as ed from '@noble/ed25519';
import { randomBytes } from 'crypto';
import type {
  TAPIdentityLevel,
  TAPRegistryChallenge,
  TAPRegistrationResponse,
  TAPAgentInfo,
  TAPAttestation,
  TAPVerificationResult
} from './types.js';
import { TAPKeychain } from './keychain.js';
import { TAPCredentialManager } from './credentials.js';

const DEFAULT_REGISTRY_URL = process.env.CLAWD_TAP_REGISTRY || 'https://tap-registry.visa.com/v1';
const CHAIN_ID = 8453; // Base mainnet

// Mock mode: enable for demos without a real registry
const MOCK_MODE = process.env.CLAWD_TAP_MOCK_MODE === 'true' ||
                  process.env.CLAWD_TAP_REGISTRY === 'mock://localhost';

export class TAPRegistry {
  private registryUrl: string;
  private mockMode: boolean;

  constructor(registryUrl?: string) {
    this.registryUrl = registryUrl || DEFAULT_REGISTRY_URL;
    this.mockMode = MOCK_MODE || this.registryUrl.startsWith('mock://');
  }

  /**
   * Check if running in mock mode
   */
  isMockMode(): boolean {
    return this.mockMode;
  }

  /**
   * Generate a new Ed25519 key pair for TAP signing
   */
  async generateKeyPair(): Promise<{ privateKey: Uint8Array; publicKey: string }> {
    const privateKey = ed.utils.randomPrivateKey();
    const publicKey = await ed.getPublicKeyAsync(privateKey);

    return {
      privateKey,
      publicKey: Buffer.from(publicKey).toString('base64')
    };
  }

  /**
   * Get SIWE challenge from registry
   */
  async getChallenge(walletAddress: string): Promise<{ challenge: TAPRegistryChallenge; message: string }> {
    const caip10Address = `eip155:${CHAIN_ID}:${walletAddress.toLowerCase()}`;

    // Mock mode: return simulated challenge
    if (this.mockMode) {
      const nonce = randomBytes(16).toString('hex');
      const issuedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      const message = `tap-registry.clawd.dev wants you to sign in with your Ethereum account:
${walletAddress}

Sign in to TAP Registry to verify your agent identity.

URI: https://tap-registry.clawd.dev
Version: 1
Chain ID: ${CHAIN_ID}
Nonce: ${nonce}
Issued At: ${issuedAt}
Expiration Time: ${expiresAt}`;

      return {
        challenge: {
          nonce,
          issuedAt,
          expiresAt,
          domain: 'tap-registry.clawd.dev'
        },
        message
      };
    }

    const response = await fetch(`${this.registryUrl}/v1/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: caip10Address,
        chain_id: CHAIN_ID
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get challenge: ${response.statusText}`);
    }

    return response.json() as Promise<{ challenge: TAPRegistryChallenge; message: string }>;
  }

  /**
   * Register agent with TAP registry
   */
  async registerAgent(params: {
    walletAddress: string;
    walletPrivateKey: string;
    name: string;
  }): Promise<{ agentId: string; verificationUrl: string; keyId: string; publicKey: string; mockMode?: boolean }> {
    // Generate Ed25519 key pair
    const { privateKey, publicKey } = await this.generateKeyPair();

    // Store private key in keychain
    await TAPKeychain.savePrivateKey(Buffer.from(privateKey).toString('hex'));

    const caip10Address = `eip155:${CHAIN_ID}:${params.walletAddress.toLowerCase()}`;

    // Mock mode: simulate registration
    if (this.mockMode) {
      const agentId = `agent_${randomBytes(16).toString('hex')}`;
      const keyId = `key_${randomBytes(8).toString('hex')}`;

      // Save agent info locally
      await TAPCredentialManager.saveAgent(
        {
          agentId,
          keyId,
          publicKey,
          registeredAt: new Date().toISOString()
        },
        caip10Address,
        params.name,
        'mock://tap-registry.clawd.dev'
      );

      return {
        agentId,
        verificationUrl: `https://tap-registry.clawd.dev/verify/${agentId}`,
        keyId,
        publicKey,
        mockMode: true
      };
    }

    // Get SIWE challenge
    const { message: siweMessage } = await this.getChallenge(params.walletAddress);

    // Sign with wallet
    const wallet = new ethers.Wallet(params.walletPrivateKey);
    const walletSignature = await wallet.signMessage(siweMessage);

    // Register with registry
    const response = await fetch(`${this.registryUrl}/v1/agents/register-wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: caip10Address,
        name: params.name,
        public_key: publicKey,
        algorithm: 'ed25519',
        wallet_signature: walletSignature,
        wallet_message: siweMessage
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { detail?: string };
      throw new Error(error.detail || `Registration failed: ${response.statusText}`);
    }

    const data = await response.json() as TAPRegistrationResponse;

    // Save agent info
    await TAPCredentialManager.saveAgent(
      {
        agentId: data.agent.id,
        keyId: data.agent.keys[0].key_id,
        publicKey,
        registeredAt: new Date().toISOString()
      },
      caip10Address,
      params.name,
      this.registryUrl
    );

    return {
      agentId: data.agent.id,
      verificationUrl: data.verification_url,
      keyId: data.agent.keys[0].key_id,
      publicKey
    };
  }

  /**
   * Complete identity verification (demo mode)
   * In production, this would poll for OAuth completion
   */
  async completeVerificationDemo(agentId: string, level: TAPIdentityLevel): Promise<TAPVerificationResult> {
    // Mock mode: simulate successful verification
    if (this.mockMode) {
      const issuedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year

      // Generate a mock JWT (not cryptographically valid, just for demo)
      const header = Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        iss: 'mock://tap-registry.clawd.dev',
        sub: agentId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
        identity_level: level,
        reputation_score: level === 'kyb' ? 85.0 : level === 'kyc' ? 70.0 : 50.0
      })).toString('base64url');
      const mockSignature = randomBytes(32).toString('base64url');
      const mockJwt = `${header}.${payload}.${mockSignature}`;

      // Save attestation locally
      const attestation: TAPAttestation = {
        identityLevel: level,
        attestationJwt: mockJwt,
        issuedAt,
        expiresAt,
        issuer: 'mock://tap-registry.clawd.dev'
      };

      await TAPCredentialManager.saveAttestation(attestation);

      // Return score based on verification level
      const reputationScore = level === 'kyb' ? 85.0 : level === 'kyc' ? 70.0 : 50.0;

      return {
        status: 'verified',
        agentId,
        identityLevel: level,
        reputationScore,
        mockMode: true
      };
    }

    const response = await fetch(
      `${this.registryUrl}/v1/agents/${agentId}/verify-demo?level=${level}`,
      { method: 'POST' }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { detail?: string };
      return {
        status: 'failed',
        error: error.detail || 'Verification failed'
      };
    }

    interface VerifyDemoResponse {
      agent: {
        identity: {
          level: TAPIdentityLevel;
          attestation_jwt: string;
          issued_at: string;
          expires_at: string;
        };
      };
    }

    const data = await response.json() as VerifyDemoResponse;

    // Save attestation
    const attestation: TAPAttestation = {
      identityLevel: data.agent.identity.level,
      attestationJwt: data.agent.identity.attestation_jwt,
      issuedAt: data.agent.identity.issued_at,
      expiresAt: data.agent.identity.expires_at,
      issuer: this.registryUrl
    };

    await TAPCredentialManager.saveAttestation(attestation);

    return {
      status: 'verified',
      agentId,
      identityLevel: data.agent.identity.level,
      reputationScore: 50.0 // New user baseline
    };
  }

  /**
   * Verify agent with registry (for merchants)
   */
  async verifyAgent(walletAddress: string, attestation: string): Promise<{
    valid: boolean;
    identityLevel?: TAPIdentityLevel;
    reputationScore?: number;
    error?: string;
  }> {
    const response = await fetch(`${this.registryUrl}/v1/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: walletAddress,
        attestation
      })
    });

    if (!response.ok) {
      return {
        valid: false,
        error: `Verification failed: ${response.statusText}`
      };
    }

    interface VerifyResponse {
      valid: boolean;
      error?: string;
      identity_level?: TAPIdentityLevel;
      reputation?: {
        reputation_score?: number;
      };
    }

    const data = await response.json() as VerifyResponse;

    if (!data.valid) {
      return {
        valid: false,
        error: data.error
      };
    }

    return {
      valid: true,
      identityLevel: data.identity_level,
      reputationScore: data.reputation?.reputation_score
    };
  }

  /**
   * Get reputation from registry
   */
  async getReputation(agentId: string): Promise<{
    totalTransactions: number;
    uniqueMerchants: number;
    disputeRate: number;
    reputationScore: number;
  } | null> {
    try {
      const agent = await TAPCredentialManager.loadAgent();
      const attestation = await TAPCredentialManager.loadAttestation();

      if (!agent || !attestation) {
        return null;
      }

      const result = await this.verifyAgent(agent.walletAddress, attestation.attestationJwt);

      if (!result.valid) {
        return null;
      }

      // The full reputation data comes from the verify endpoint
      return {
        totalTransactions: 0, // Would come from registry
        uniqueMerchants: 0,
        disputeRate: 0,
        reputationScore: result.reputationScore || 0
      };
    } catch {
      return null;
    }
  }

  /**
   * Revoke TAP credentials (delete from registry and local storage)
   */
  async revokeAgent(agentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Try to revoke from registry
      const response = await fetch(`${this.registryUrl}/v1/agents/${agentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      // Even if registry revocation fails, delete local credentials
      await TAPCredentialManager.deleteAll();

      if (!response.ok) {
        return {
          success: true, // Local deletion succeeded
          error: `Registry revocation may have failed: ${response.statusText}`
        };
      }

      return { success: true };
    } catch (error) {
      // Still delete local credentials on error
      await TAPCredentialManager.deleteAll();
      return {
        success: true, // Local deletion succeeded
        error: `Registry revocation failed: ${(error as Error).message}`
      };
    }
  }
}
