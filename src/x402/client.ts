/**
 * x402 protocol client implementation (v1)
 */

import { ethers } from 'ethers';
import type { X402Response, X402PaymentOption, X402PaymentPayload } from '../types/index.js';

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body?: string;
}

export class X402Client {
  /**
   * Make an HTTP request
   */
  static async makeRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<HttpResponse> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    let body: string | undefined;
    try {
      body = await response.text();
    } catch {
      // Body might not be available
    }

    return {
      status: response.status,
      headers,
      body
    };
  }

  /**
   * Parse x402 v1 payment details from JSON response body
   */
  static parseX402Response(body: string): X402Response | null {
    try {
      const parsed = JSON.parse(body);

      if (parsed.x402Version !== undefined && Array.isArray(parsed.accepts)) {
        return parsed as X402Response;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Select the best payment option from accepts array
   * Prefers Base network with exact scheme
   */
  static selectPaymentOption(accepts: X402PaymentOption[]): X402PaymentOption | null {
    // First, try to find exact scheme on base mainnet
    const baseExact = accepts.find(
      opt => opt.scheme === 'exact' && opt.network === 'base'
    );
    if (baseExact) return baseExact;

    // Fall back to any exact scheme
    const anyExact = accepts.find(opt => opt.scheme === 'exact');
    if (anyExact) return anyExact;

    // Fall back to first option
    return accepts[0] || null;
  }

  /**
   * Generate EIP-3009 style authorization for USDC transfer
   * This creates a signed authorization that can be verified on-chain
   */
  static async generatePaymentAuthorization(
    wallet: ethers.HDNodeWallet | ethers.Wallet,
    payTo: string,
    amount: string,
    asset: string,
    validityWindow: number = 3600 // 1 hour default
  ): Promise<{ authorization: any; signature: string }> {
    const now = Math.floor(Date.now() / 1000);
    const validAfter = (now - 60).toString(); // Valid from 1 minute ago
    const validBefore = (now + validityWindow).toString();
    const nonce = ethers.hexlify(ethers.randomBytes(32));

    const authorization = {
      from: wallet.address,
      to: payTo,
      value: amount,
      validAfter,
      validBefore,
      nonce
    };

    // Create EIP-712 typed data for signing
    const domain = {
      name: 'USD Coin',
      version: '2',
      chainId: 8453, // Base mainnet
      verifyingContract: asset
    };

    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' }
      ]
    };

    const value = {
      from: authorization.from,
      to: authorization.to,
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce
    };

    const signature = await wallet.signTypedData(domain, types, value);

    return { authorization, signature };
  }

  /**
   * Create X-PAYMENT header value
   */
  static createXPaymentHeader(
    paymentOption: X402PaymentOption,
    authorization: any,
    signature: string
  ): string {
    const payload: X402PaymentPayload = {
      x402Version: 1,
      scheme: paymentOption.scheme,
      network: paymentOption.network,
      payload: {
        signature,
        txHash: authorization.txHash || '',
        authorization: {
          from: authorization.from,
          to: authorization.to,
          value: authorization.value,
          validAfter: authorization.validAfter,
          validBefore: authorization.validBefore,
          nonce: authorization.nonce,
          txHash: authorization.txHash || ''
        }
      }
    };

    // Base64 encode the JSON payload
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * Convert maxAmountRequired (in base units) to human-readable amount
   * USDC has 6 decimals
   */
  static parseAmount(maxAmountRequired: string, decimals: number = 6): number {
    return parseFloat(maxAmountRequired) / Math.pow(10, decimals);
  }

  /**
   * Convert human-readable amount to base units
   */
  static toBaseUnits(amount: number, decimals: number = 6): string {
    return Math.floor(amount * Math.pow(10, decimals)).toString();
  }
}
