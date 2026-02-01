/**
 * Referral code manager - handles generation, validation, and storage
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomBytes } from 'crypto';
import type {
  ReferralCode,
  ReferralConfig,
  CodeGenerationOptions,
  ReferralStats
} from './types.js';

const DEFAULT_CONFIG: ReferralConfig = {
  defaultAmount: 15,        // $15 USDC
  defaultExpiry: 30,        // 30 days
  treasuryAddress: '',
  codeLength: 8,
  codePrefix: ''
};

export class ReferralManager {
  private dataDir: string;
  private codesFile: string;
  private configFile: string;
  private codes: Map<string, ReferralCode>;
  private config: ReferralConfig;

  constructor() {
    this.dataDir = join(homedir(), '.clawd', 'referral');
    this.codesFile = join(this.dataDir, 'codes.json');
    this.configFile = join(this.dataDir, 'config.json');
    this.codes = new Map();
    this.config = DEFAULT_CONFIG;
    this.ensureDataDir();
    this.load();
  }

  private ensureDataDir(): void {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private load(): void {
    // Load codes
    if (existsSync(this.codesFile)) {
      try {
        const data = JSON.parse(readFileSync(this.codesFile, 'utf-8'));
        this.codes = new Map(Object.entries(data));
      } catch {
        this.codes = new Map();
      }
    }

    // Load config
    if (existsSync(this.configFile)) {
      try {
        const data = JSON.parse(readFileSync(this.configFile, 'utf-8'));
        this.config = { ...DEFAULT_CONFIG, ...data };
      } catch {
        this.config = DEFAULT_CONFIG;
      }
    }
  }

  private save(): void {
    const codesObj = Object.fromEntries(this.codes);
    writeFileSync(this.codesFile, JSON.stringify(codesObj, null, 2));
    writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
  }

  /**
   * Generate a unique referral code
   */
  private generateCodeString(prefix: string = ''): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars: 0/O, 1/I/L
    const length = this.config.codeLength - prefix.length;
    let code = prefix.toUpperCase();

    const bytes = randomBytes(length);
    for (let i = 0; i < length; i++) {
      code += chars[bytes[i] % chars.length];
    }

    return code;
  }

  /**
   * Create a new referral code
   */
  createCode(options: CodeGenerationOptions = {}, createdBy: string = 'admin'): ReferralCode {
    const {
      amount = this.config.defaultAmount,
      expiresInDays = this.config.defaultExpiry,
      campaign = null,
      prefix = this.config.codePrefix,
      maxUses = 1
    } = options;

    // Generate unique code
    let code: string;
    do {
      code = this.generateCodeString(prefix);
    } while (this.codes.has(code));

    const now = Date.now();
    const referralCode: ReferralCode = {
      code,
      amount,
      createdAt: now,
      expiresAt: expiresInDays > 0 ? now + (expiresInDays * 24 * 60 * 60 * 1000) : null,
      redeemedAt: null,
      redeemedBy: null,
      txHash: null,
      createdBy,
      campaign,
      maxUses,
      useCount: 0
    };

    this.codes.set(code, referralCode);
    this.save();

    return referralCode;
  }

  /**
   * Create multiple codes at once
   */
  createBatch(count: number, options: CodeGenerationOptions = {}, createdBy: string = 'admin'): ReferralCode[] {
    const codes: ReferralCode[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(this.createCode(options, createdBy));
    }
    return codes;
  }

  /**
   * Validate a code for redemption
   */
  validateCode(code: string): { valid: boolean; error?: string; referralCode?: ReferralCode } {
    const normalizedCode = code.toUpperCase().trim();
    const referralCode = this.codes.get(normalizedCode);

    if (!referralCode) {
      return { valid: false, error: 'Invalid referral code' };
    }

    // Check if already fully redeemed
    if (referralCode.useCount >= referralCode.maxUses) {
      return { valid: false, error: 'Code has already been redeemed' };
    }

    // Check expiry
    if (referralCode.expiresAt && Date.now() > referralCode.expiresAt) {
      return { valid: false, error: 'Code has expired' };
    }

    return { valid: true, referralCode };
  }

  /**
   * Get code details
   */
  getCode(code: string): ReferralCode | null {
    return this.codes.get(code.toUpperCase().trim()) || null;
  }

  /**
   * Mark a code as redeemed
   */
  markRedeemed(code: string, redeemedBy: string, txHash: string): void {
    const normalizedCode = code.toUpperCase().trim();
    const referralCode = this.codes.get(normalizedCode);

    if (referralCode) {
      referralCode.useCount++;
      if (referralCode.useCount >= referralCode.maxUses) {
        referralCode.redeemedAt = Date.now();
        referralCode.redeemedBy = redeemedBy;
        referralCode.txHash = txHash;
      }
      this.codes.set(normalizedCode, referralCode);
      this.save();
    }
  }

  /**
   * Check if address has already redeemed any code
   */
  hasAddressRedeemed(address: string): boolean {
    const normalizedAddress = address.toLowerCase();
    for (const code of this.codes.values()) {
      if (code.redeemedBy?.toLowerCase() === normalizedAddress) {
        return true;
      }
    }
    return false;
  }

  /**
   * List all codes with optional filters
   */
  listCodes(filters?: {
    active?: boolean;
    redeemed?: boolean;
    campaign?: string;
    limit?: number;
  }): ReferralCode[] {
    let codes = Array.from(this.codes.values());

    if (filters?.active !== undefined) {
      const now = Date.now();
      codes = codes.filter(c => {
        const isActive = c.useCount < c.maxUses && (!c.expiresAt || c.expiresAt > now);
        return filters.active ? isActive : !isActive;
      });
    }

    if (filters?.redeemed !== undefined) {
      codes = codes.filter(c => filters.redeemed ? c.redeemedAt !== null : c.redeemedAt === null);
    }

    if (filters?.campaign) {
      codes = codes.filter(c => c.campaign === filters.campaign);
    }

    // Sort by creation date, newest first
    codes.sort((a, b) => b.createdAt - a.createdAt);

    if (filters?.limit) {
      codes = codes.slice(0, filters.limit);
    }

    return codes;
  }

  /**
   * Get statistics about referral codes
   */
  getStats(): ReferralStats {
    const now = Date.now();
    const allCodes = Array.from(this.codes.values());

    const active = allCodes.filter(c =>
      c.useCount < c.maxUses && (!c.expiresAt || c.expiresAt > now)
    );
    const redeemed = allCodes.filter(c => c.redeemedAt !== null);
    const expired = allCodes.filter(c =>
      c.expiresAt && c.expiresAt <= now && c.redeemedAt === null
    );

    const totalPaidOut = redeemed.reduce((sum, c) => sum + c.amount, 0);

    // Calculate average time to redemption
    const redemptionTimes = redeemed
      .filter(c => c.redeemedAt && c.createdAt)
      .map(c => c.redeemedAt! - c.createdAt);

    const averageRedemptionTime = redemptionTimes.length > 0
      ? redemptionTimes.reduce((a, b) => a + b, 0) / redemptionTimes.length
      : null;

    return {
      totalCodes: allCodes.length,
      activeCodesCount: active.length,
      redeemedCodesCount: redeemed.length,
      expiredCodesCount: expired.length,
      totalPaidOut,
      averageRedemptionTime
    };
  }

  /**
   * Delete a code (admin only)
   */
  deleteCode(code: string): boolean {
    const normalizedCode = code.toUpperCase().trim();
    if (this.codes.has(normalizedCode)) {
      this.codes.delete(normalizedCode);
      this.save();
      return true;
    }
    return false;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ReferralConfig>): void {
    this.config = { ...this.config, ...updates };
    this.save();
  }

  /**
   * Get current configuration
   */
  getConfig(): ReferralConfig {
    return { ...this.config };
  }

  /**
   * Set treasury address
   */
  setTreasuryAddress(address: string): void {
    this.config.treasuryAddress = address;
    this.save();
  }
}
