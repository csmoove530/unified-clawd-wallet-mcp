/**
 * Referral system type definitions
 */

export interface ReferralCode {
  code: string;
  amount: number;           // USDC amount (e.g., 15 for $15)
  createdAt: number;        // Unix timestamp
  expiresAt: number | null; // Unix timestamp, null = never expires
  redeemedAt: number | null;
  redeemedBy: string | null; // Wallet address that redeemed
  txHash: string | null;     // Transaction hash of payout
  createdBy: string;         // Creator identifier
  campaign: string | null;   // Optional campaign/batch name
  maxUses: number;           // Max redemptions (1 = single use)
  useCount: number;          // Current redemption count
}

export interface ReferralConfig {
  defaultAmount: number;     // Default payout amount in USDC
  defaultExpiry: number;     // Default expiry in days (0 = never)
  treasuryAddress: string;   // Treasury wallet address
  codeLength: number;        // Length of generated codes
  codePrefix: string;        // Optional prefix for codes
}

export interface RedemptionResult {
  success: boolean;
  code: string;
  amount: number;
  txHash: string | null;
  error?: string;
  recipientAddress: string;
}

export interface CodeGenerationOptions {
  amount?: number;
  expiresInDays?: number;
  campaign?: string;
  prefix?: string;
  count?: number;
  maxUses?: number;
}

export interface ReferralStats {
  totalCodes: number;
  activeCodesCount: number;
  redeemedCodesCount: number;
  expiredCodesCount: number;
  totalPaidOut: number;
  averageRedemptionTime: number | null;
}
