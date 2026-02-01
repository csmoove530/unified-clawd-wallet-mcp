/**
 * TAP RFC 9421 HTTP Message Signatures
 */

import * as ed from '@noble/ed25519';
import * as crypto from 'crypto';
import { TAPKeychain } from './keychain.js';
import { TAPCredentialManager } from './credentials.js';
import type { TAPHeaders, TAPCredentials } from './types.js';

export class TAPSigner {
  /**
   * Build TAP headers for an x402 payment request
   */
  static async buildHeaders(params: {
    method: string;
    url: string;
    payment: string;
  }): Promise<TAPHeaders | null> {
    // Load TAP credentials
    const credentials = await TAPCredentialManager.loadCredentials();

    if (!credentials) {
      return null;
    }

    // Get private key from keychain
    const privateKeyHex = await TAPKeychain.getPrivateKey();
    if (!privateKeyHex) {
      return null;
    }

    const privateKey = Buffer.from(privateKeyHex, 'hex');

    return this.signRequest({
      method: params.method,
      url: params.url,
      payment: params.payment,
      credentials,
      privateKey
    });
  }

  /**
   * Sign a request with TAP credentials
   */
  static async signRequest(params: {
    method: string;
    url: string;
    payment: string;
    credentials: TAPCredentials;
    privateKey: Buffer;
  }): Promise<TAPHeaders> {
    const urlObj = new URL(params.url);
    const nonce = crypto.randomUUID();
    const created = Math.floor(Date.now() / 1000);
    const expires = created + 480; // 8 minutes

    // RFC 9421 signature components
    const components = `"@method" "@authority" "@path" "x-payment" "x-tap-attestation"`;

    const signatureInput = `sig=(${components}); created=${created}; expires=${expires}; keyid="${params.credentials.keyId}"; alg="ed25519"; nonce="${nonce}"; tag="agent-payer-auth"`;

    // Build signature base string (RFC 9421)
    const signatureBase = [
      `"@method": ${params.method.toUpperCase()}`,
      `"@authority": ${urlObj.host}`,
      `"@path": ${urlObj.pathname}${urlObj.search}`,
      `"x-payment": ${params.payment}`,
      `"x-tap-attestation": ${params.credentials.attestationJwt}`,
      `"@signature-params": (${components}); created=${created}; expires=${expires}; keyid="${params.credentials.keyId}"; alg="ed25519"; nonce="${nonce}"; tag="agent-payer-auth"`
    ].join('\n');

    // Sign with Ed25519
    const messageBytes = new TextEncoder().encode(signatureBase);
    const signature = await ed.signAsync(messageBytes, params.privateKey);
    const signatureB64 = Buffer.from(signature).toString('base64');

    return {
      'X-TAP-Attestation': params.credentials.attestationJwt,
      'X-TAP-Signature-Input': signatureInput,
      'X-TAP-Signature': `sig=:${signatureB64}:`
    };
  }

  /**
   * Check if TAP headers can be generated
   */
  static async canSign(): Promise<boolean> {
    const credentials = await TAPCredentialManager.loadCredentials();
    return credentials !== null;
  }
}
