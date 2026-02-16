/**
 * Canton Network module (SDK-based)
 */

export { CantonKeychain } from './keychain.js';
export type { CantonCredentials } from './keychain.js';

export {
  getSDK,
  ensureParty,
  getBalance,
  getHoldings,
  getPartyInfo,
  transfer,
  getTransactionHistory,
  configure,
  getLedgerApiUrl,
  getValidatorUrl,
  getScanProxyUrl,
} from './sdk-client.js';

export type { CantonNetwork } from './config.js';
export { getLedgerApiUrl as getCantonLedgerApiUrl, getValidatorUrl as getCantonValidatorUrl } from './config.js';

export type {
  CantonConfig,
  CantonPartyId,
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

export { CANTON_DEVNET_ENDPOINTS, CANTON_COIN } from './types.js';
