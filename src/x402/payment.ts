/**
 * x402 payment execution handler (v1 protocol)
 */

import { ethers } from 'ethers';
import { X402Client } from './client.js';
import { WalletManager } from '../wallet/manager.js';
import { BalanceChecker } from '../wallet/balance.js';
import { TransactionHistory } from '../wallet/history.js';
import { SpendLimits } from '../security/limits.js';
import { AuditLogger } from '../security/audit.js';
import { ConfigManager } from '../config/manager.js';
import { TAPSigner, TAPCredentialManager } from '../tap/index.js';
import type { Transaction, X402PaymentOption } from '../types/index.js';

export interface PaymentResult {
  success: boolean;
  response?: any;
  error?: string;
  amountPaid?: number;
  service?: string;
}

export class PaymentHandler {
  private walletManager: WalletManager;
  private balanceChecker: BalanceChecker | null = null;

  constructor() {
    this.walletManager = new WalletManager();
  }

  /**
   * Initialize payment handler
   */
  async initialize(): Promise<void> {
    await this.walletManager.loadFromKeychain();
    const config = await ConfigManager.loadConfig();
    this.balanceChecker = new BalanceChecker(
      config.wallet.rpcUrl,
      config.wallet.usdcContract
    );
  }

  /**
   * Execute full x402 payment flow (v1 protocol)
   */
  async executePayment(
    url: string,
    method: string = 'GET',
    body?: string,
    description?: string
  ): Promise<PaymentResult> {
    try {
      // Step 1: Make initial request
      const initialResponse = await X402Client.makeRequest(url, { method, body });

      // Step 2: Check if payment is required
      if (initialResponse.status !== 402) {
        // No payment required, return response directly
        return {
          success: true,
          response: initialResponse.body ? JSON.parse(initialResponse.body) : null
        };
      }

      // Step 3: Parse x402 v1 payment details from response body
      if (!initialResponse.body) {
        return {
          success: false,
          error: 'Payment required but no payment details provided'
        };
      }

      const x402Response = X402Client.parseX402Response(initialResponse.body);
      if (!x402Response || !x402Response.accepts || x402Response.accepts.length === 0) {
        return {
          success: false,
          error: 'Invalid x402 response format'
        };
      }

      // Step 4: Select payment option
      const paymentOption = X402Client.selectPaymentOption(x402Response.accepts);
      if (!paymentOption) {
        return {
          success: false,
          error: 'No compatible payment option found'
        };
      }

      // Step 5: Parse and validate amount
      const amount = X402Client.parseAmount(paymentOption.maxAmountRequired);
      const validation = await this.validateAmount(amount);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Step 6: Check balance
      const hasBalance = await this.checkBalance(amount);
      if (!hasBalance) {
        return {
          success: false,
          error: `Insufficient balance. Required: $${amount.toFixed(2)} USDC`
        };
      }

      // Step 7: Generate payment authorization
      const wallet = this.walletManager.getWallet();
      const { authorization, signature } = await X402Client.generatePaymentAuthorization(
        wallet,
        paymentOption.payTo,
        paymentOption.maxAmountRequired,
        paymentOption.asset
      );

      // Step 8: Create X-PAYMENT header
      const xPaymentHeader = X402Client.createXPaymentHeader(
        paymentOption,
        authorization,
        signature
      );

      // Step 9: Build headers with TAP if available
      const headers: Record<string, string> = {
        'X-PAYMENT': xPaymentHeader
      };

      // Add TAP headers if identity is verified
      try {
        const tapHeaders = await TAPSigner.buildHeaders({
          method,
          url,
          payment: xPaymentHeader
        });

        if (tapHeaders) {
          Object.assign(headers, tapHeaders);
          await AuditLogger.logAction('tap_headers_included', {
            url,
            hasAttestation: true
          });
        }
      } catch (tapError) {
        // TAP signing failed, continue without TAP headers
        await AuditLogger.logAction('tap_headers_skipped', {
          url,
          reason: (tapError as Error).message
        });
      }

      // Step 10: Retry request with payment proof (and TAP headers if available)
      const paymentResponse = await X402Client.makeRequest(url, {
        method,
        body,
        headers
      });

      // Step 10: Handle response
      const serviceName = new URL(url).hostname;

      if (paymentResponse.status >= 200 && paymentResponse.status < 300) {
        // Payment successful
        const transaction: Transaction = {
          id: ethers.hexlify(ethers.randomBytes(16)),
          timestamp: Date.now(),
          service: serviceName,
          description: description || paymentOption.description || 'x402 payment',
          amount,
          currency: 'USDC',
          status: 'success'
        };

        await TransactionHistory.addTransaction(transaction);
        await AuditLogger.logAction('payment_executed', {
          url,
          amount,
          service: serviceName,
          payTo: paymentOption.payTo
        });

        let responseData = null;
        if (paymentResponse.body) {
          try {
            responseData = JSON.parse(paymentResponse.body);
          } catch {
            responseData = paymentResponse.body;
          }
        }

        return {
          success: true,
          response: responseData,
          amountPaid: amount,
          service: serviceName
        };
      }

      // Payment failed
      await AuditLogger.logAction('payment_failed', {
        url,
        amount,
        status: paymentResponse.status,
        response: paymentResponse.body
      });

      // Try to parse error message
      let errorMsg = `Payment failed with status ${paymentResponse.status}`;
      if (paymentResponse.body) {
        try {
          const errorBody = JSON.parse(paymentResponse.body);
          if (errorBody.error) {
            errorMsg = errorBody.error;
          } else if (errorBody.message) {
            errorMsg = errorBody.message;
          }
        } catch {
          // Use default error message
        }
      }

      return {
        success: false,
        error: errorMsg
      };

    } catch (error) {
      await AuditLogger.logAction('payment_error', {
        url,
        error: (error as Error).message
      });

      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Validate transaction amount against limits
   */
  async validateAmount(amount: number): Promise<{ valid: boolean; errors: string[] }> {
    return await SpendLimits.validateTransaction(amount);
  }

  /**
   * Check if wallet has sufficient balance
   */
  async checkBalance(requiredAmount: number): Promise<boolean> {
    if (!this.balanceChecker) {
      throw new Error('Payment handler not initialized');
    }

    const wallet = this.walletManager.getWallet();
    return await this.balanceChecker.hasSufficientBalance(wallet.address, requiredAmount);
  }
}
