/**
 * Canton Network type definitions
 */

/**
 * Canton Network configuration
 */
export type CantonNetwork = 'devnet' | 'testnet' | 'mainnet' | 'localnet';

/**
 * Canton party identifier
 */
export interface CantonPartyId {
  party: string;
  displayName?: string;
}

/**
 * Canton configuration stored in config.json
 */
export interface CantonConfig {
  enabled: boolean;
  partyId?: string;
  displayName?: string;
  network: CantonNetwork;
  validatorUrl?: string;
  ledgerApiUrl?: string;
}

/**
 * Canton token holding (CIP-56 compliant)
 */
export interface CantonHolding {
  tokenId: string;
  symbol: string;
  amount: string;
  registry: string;
  utxoCount: number;
  issuer?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Canton party information
 */
export interface CantonPartyInfo {
  partyId: string;
  displayName: string;
  validatorUrl: string;
  ledgerApiUrl: string;
  network: CantonNetwork;
  isConnected: boolean;
}

/**
 * Canton transfer instruction (CIP-56)
 */
export interface CantonTransferInstruction {
  sender: string;
  recipient: string;
  tokenId: string;
  amount: string;
  nonce?: string;
  validAfter?: number;
  validBefore?: number;
}

/**
 * Canton transfer result
 */
export interface CantonTransferResult {
  success: boolean;
  transferId: string;
  recipient: string;
  amount: string;
  tokenSymbol: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  error?: string;
}

/**
 * Canton transaction history entry
 */
export interface CantonTransaction {
  id: string;
  type: 'send' | 'receive';
  counterparty: string;
  amount: string;
  tokenSymbol: string;
  tokenId: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * Canton balance response
 */
export interface CantonBalanceResult {
  success: boolean;
  partyId: string;
  network: CantonNetwork;
  balance: string;
  symbol: string;
  formattedBalance: string;
  error?: string;
}

/**
 * Canton holdings response
 */
export interface CantonHoldingsResult {
  success: boolean;
  partyId: string;
  network: CantonNetwork;
  holdings: CantonHolding[];
  totalHoldings: number;
  error?: string;
}

/**
 * Canton configure result
 */
export interface CantonConfigureResult {
  success: boolean;
  partyId?: string;
  network?: CantonNetwork;
  validatorUrl?: string;
  ledgerApiUrl?: string;
  message?: string;
  error?: string;
}

/**
 * Canton transaction history result
 */
export interface CantonHistoryResult {
  success: boolean;
  partyId: string;
  transactions: CantonTransaction[];
  count: number;
  error?: string;
}

/**
 * DevNet endpoints configuration
 */
export const CANTON_DEVNET_ENDPOINTS = {
  validatorUrl: 'https://canton-devnet.digitalasset.com/api/v1',
  ledgerApiUrl: 'https://canton-devnet.digitalasset.com/ledger/v1',
} as const;

/**
 * Canton Coin (CC) token configuration
 */
export const CANTON_COIN = {
  tokenId: 'canton-coin',
  symbol: 'CC',
  decimals: 6,
  registry: 'devnet::canton-coin-registry',
} as const;
