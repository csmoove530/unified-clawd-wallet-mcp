/**
 * Configuration schema validation using Zod
 */

import { z } from 'zod';

export const WalletConfigSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  network: z.enum(['base-mainnet', 'base-sepolia']),
  rpcUrl: z.string().url(),
  usdcContract: z.string().regex(/^0x[a-fA-F0-9]{40}$/)
});

export const SecurityConfigSchema = z.object({
  maxTransactionAmount: z.number().positive(),
  autoApproveUnder: z.number().nonnegative(),
  dailyLimit: z.number().positive()
});

export const MCPConfigSchema = z.object({
  enabled: z.boolean(),
  port: z.number().int().min(1024).max(65535).optional(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error'])
});

export const CantonConfigSchema = z.object({
  enabled: z.boolean().default(false),
  partyId: z.string().optional(),
  displayName: z.string().optional(),
  network: z.enum(['devnet', 'testnet', 'mainnet']).default('devnet'),
  validatorUrl: z.string().url().optional(),
  ledgerApiUrl: z.string().url().optional()
});

export const ClawdConfigSchema = z.object({
  wallet: WalletConfigSchema,
  security: SecurityConfigSchema,
  mcp: MCPConfigSchema,
  canton: CantonConfigSchema.optional()
});

export type ClawdConfigType = z.infer<typeof ClawdConfigSchema>;
export type CantonConfigType = z.infer<typeof CantonConfigSchema>;
