/**
 * Core type definitions for CLAWD Wallet
 */

export interface WalletConfig {
  address: string;
  network: 'base-mainnet' | 'base-sepolia';
  rpcUrl: string;
  usdcContract: string;
}

export interface SecurityConfig {
  maxTransactionAmount: number;
  autoApproveUnder: number;
  dailyLimit: number;
}

export interface MCPConfig {
  enabled: boolean;
  port?: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface ClawdConfig {
  wallet: WalletConfig;
  security: SecurityConfig;
  mcp: MCPConfig;
}

export interface Transaction {
  id: string;
  timestamp: number;
  service: string;
  description: string;
  amount: number;
  currency: string;
  txHash?: string;
  status: 'pending' | 'success' | 'failed';
  blockNumber?: number;
}

export interface PaymentRequest {
  url: string;
  method: string;
  description: string;
  maxAmount: number;
  body?: string;
}

export interface PaymentDetails {
  recipient: string;
  amount: number;
  currency: string;
  description: string;
  nonce: string;
}

export interface ApprovalRequest {
  payment: PaymentDetails;
  service: string;
  url: string;
}

export interface ApprovalResponse {
  approved: boolean;
  reason?: string;
}

export interface X402Service {
  name: string;
  url: string;
  description: string;
  pricing: {
    currency: string;
    amount: number;
    per: string;
  };
  category: string;
}

/**
 * x402 Protocol v1 types
 */
export interface X402PaymentOption {
  scheme: 'exact' | string;
  network: 'base' | 'base-sepolia' | string;
  maxAmountRequired: string;
  resource: string;
  description?: string;
  mimeType?: string;
  payTo: string;
  maxTimeoutSeconds?: number;
  asset: string;
  extra?: {
    name?: string;
    version?: string;
    nonce?: string;
  };
}

export interface X402Response {
  x402Version: number;
  error?: string;
  accepts: X402PaymentOption[];
}

export interface X402PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    signature: string;
    txHash?: string;
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
      txHash?: string;
    };
  };
}

export interface BalanceInfo {
  address: string;
  balance: string;
  decimals: number;
  symbol: string;
}

/**
 * TAP (Trusted Agent Protocol) types
 */
export type { TAPCredentials, TAPIdentityLevel, TAPStatus, TAPHeaders } from '../tap/types.js';
