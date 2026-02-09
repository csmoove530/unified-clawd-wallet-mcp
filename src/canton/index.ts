/**
 * Canton Network module exports
 */

export { CantonClient } from './client.js';
export { HoldingsManager } from './holdings.js';
export { TransferManager } from './transfer.js';
export { PartyManager } from './party.js';
export { CantonKeychain } from './keychain.js';
export type { CantonCredentials } from './keychain.js';

export type {
  CantonNetwork,
  CantonPartyId,
  CantonConfig,
  CantonHolding,
  CantonPartyInfo,
  CantonTransferInstruction,
  CantonTransferResult,
  CantonTransaction,
  CantonBalanceResult,
  CantonHoldingsResult,
  CantonConfigureResult,
  CantonHistoryResult,
} from './types.js';

export {
  CANTON_DEVNET_ENDPOINTS,
  CANTON_COIN,
} from './types.js';
