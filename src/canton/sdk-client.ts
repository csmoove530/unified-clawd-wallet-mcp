/**
 * Canton Network integration using @canton-network/wallet-sdk.
 * Configures DevNet (or LocalNet) and exposes balance, holdings, transfers, and history.
 */

import {
  WalletSDKImpl,
  LedgerController,
  TokenStandardController,
  ValidatorController,
  TopologyController,
  localNetAuthDefault,
  createKeyPair,
  type WalletSDK,
} from '@canton-network/wallet-sdk';
import { v4 } from 'uuid';
import { getLedgerApiUrl, getValidatorUrl, getScanProxyUrl, type CantonNetwork } from './config.js';
import { CantonKeychain, type CantonCredentials } from './keychain.js';
import type {
  CantonConfig,
  CantonPartyInfo,
  CantonHolding,
  CantonTransferResult,
  CantonTransaction,
} from './types.js';

const DEFAULT_INSTRUMENT_ID = 'Amulet';
const CANTON_COIN_SYMBOL = 'CC';
const CANTON_COIN_DECIMALS = 6;

let sdkInstance: WalletSDK | null = null;
let sdkInitPromise: Promise<WalletSDK> | null = null;
/** Connection key used to create the current SDK; if env/URLs change, we reset and reconnect. */
let sdkConnectionKey: string | null = null;

function getConnectionKey(): string {
  const useLocalNet = process.env.CANTON_USE_LOCALNET === 'true';
  return `${useLocalNet}:${getLedgerApiUrl(useLocalNet)}:${getValidatorUrl(useLocalNet)}`;
}

function getLogger() {
  return {
    info: () => {},
    debug: () => {},
    warn: (...args: unknown[]) => console.warn('[Canton]', ...args),
    error: (...args: unknown[]) => console.error('[Canton]', ...args),
    child: () => getLogger(),
  };
}

/**
 * Build SDK configured for DevNet (or LocalNet when CANTON_USE_LOCALNET=true).
 */
function createDevNetSDK(): WalletSDK {
  const useLocalNet = process.env.CANTON_USE_LOCALNET === 'true';
  const ledgerUrl = new URL(getLedgerApiUrl(useLocalNet));
  const validatorUrl = new URL(getValidatorUrl(useLocalNet));
  const scanProxyUrl = new URL(getScanProxyUrl(useLocalNet));

  console.warn('[Canton] createDevNetSDK:', {
    useLocalNet,
    ledgerUrl: ledgerUrl.href,
    validatorUrl: validatorUrl.href,
    scanProxyUrl: scanProxyUrl.href,
  });

  const auth = localNetAuthDefault(getLogger());

  const ledgerFactory = (userId: string, authTokenProvider: import('@canton-network/core-wallet-auth').AccessTokenProvider, isAdmin: boolean) =>
    new LedgerController(userId, ledgerUrl, undefined, isAdmin, authTokenProvider);

  const tokenStandardFactory = (
    userId: string,
    authTokenProvider: import('@canton-network/core-wallet-auth').AccessTokenProvider,
    isAdmin: boolean
  ) =>
    new TokenStandardController(
      userId,
      ledgerUrl,
      validatorUrl,
      undefined,
      authTokenProvider,
      isAdmin,
      false,
      undefined
    );

  const validatorFactory = (userId: string, authTokenProvider: import('@canton-network/core-wallet-auth').AccessTokenProvider) =>
    new ValidatorController(userId, validatorUrl, authTokenProvider);

  const topologyFactory = (
    userId: string,
    authTokenProvider: import('@canton-network/core-wallet-auth').AccessTokenProvider,
    synchronizerId: string
  ) =>
    new TopologyController(
      validatorUrl.toString(),
      ledgerUrl,
      userId,
      synchronizerId,
      undefined,
      authTokenProvider
    );

  return new WalletSDKImpl().configure({
    logger: getLogger(),
    authFactory: () => auth,
    ledgerFactory,
    topologyFactory,
    tokenStandardFactory,
    validatorFactory,
  });
}

/**
 * Get or create singleton SDK instance and ensure connected.
 * Resets and reconnects if CANTON_USE_LOCALNET or CANTON_*_URL change.
 */
export async function getSDK(): Promise<WalletSDK> {
  const key = getConnectionKey();
  if (sdkInstance && sdkConnectionKey !== key) {
    sdkInstance = null;
    sdkInitPromise = null;
    sdkConnectionKey = null;
  }

  if (sdkInstance) return sdkInstance;
  if (sdkInitPromise) return sdkInitPromise;

  sdkInitPromise = (async () => {
    const useLocalNet = process.env.CANTON_USE_LOCALNET === 'true';
    const ledgerUrl = getLedgerApiUrl(useLocalNet);
    const validatorUrl = getValidatorUrl(useLocalNet);
    try {
      const sdk = createDevNetSDK();
      await sdk.connect();
      await sdk.connectAdmin();
      // ScanProxyClient expects validator base URL; it requests /v0/scan-proxy/... itself.
      const validatorBaseUrl = new URL(validatorUrl);
      console.warn('[Canton] getSDK connectTopology/setTransferFactoryRegistryUrl:', {
        ledgerUrl,
        validatorUrl,
        validatorBaseUrl: validatorBaseUrl.href,
      });
      await sdk.connectTopology(validatorBaseUrl);
      sdk.tokenStandard?.setTransferFactoryRegistryUrl(validatorBaseUrl);
      sdkInstance = sdk;
      sdkConnectionKey = getConnectionKey();
      return sdk;
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      const isFetchFailed = /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(msg);
      if (isFetchFailed) {
        throw new Error(
          `${msg}. Canton connection failed. For LocalNet: set CANTON_USE_LOCALNET=true, start LocalNet (see CANTON_LOCALNET.md), and ensure ledger ${ledgerUrl} and validator ${validatorUrl} are reachable.`
        );
      }
      throw err;
    }
  })();

  return sdkInitPromise;
}

/**
 * Ensure party is set: load from keychain and setPartyId, or create new external party and save credentials.
 */
export async function ensureParty(config: CantonConfig): Promise<{ partyId: string; displayName: string }> {
  const credentials = await CantonKeychain.getCredentials();

  if (credentials) {
    const sdk = await getSDK();
    await sdk.setPartyId(credentials.partyId);
    return { partyId: credentials.partyId, displayName: credentials.displayName };
  }

  if (config.partyId) {
    const sdk = await getSDK();
    await sdk.setPartyId(config.partyId);
    return {
      partyId: config.partyId,
      displayName: config.displayName ?? `Party (${config.partyId.slice(0, 12)}...)`,
    };
  }

  const keyPair = createKeyPair();
  const displayName = config.displayName ?? 'clawd-wallet';
  const sdk = await getSDK();
  const result = await sdk.userLedger?.signAndAllocateExternalParty(keyPair.privateKey, displayName);

  if (!result?.partyId) {
    throw new Error('Failed to allocate external party on Canton Network.');
  }

  await CantonKeychain.saveCredentials({
    partyId: result.partyId,
    displayName,
    privateKey: keyPair.privateKey,
    createdAt: Date.now(),
  });

  await sdk.setPartyId(result.partyId);
  return { partyId: result.partyId, displayName };
}

/**
 * Get Canton Coin (Amulet) balance for the current party.
 */
export async function getBalance(config: CantonConfig): Promise<{
  balance: string;
  symbol: string;
  decimals: number;
}> {
  await ensureParty(config);
  const sdk = await getSDK();
  const utxos = await sdk.tokenStandard?.listHoldingUtxos(false);
  if (!utxos?.length) {
    return { balance: '0', symbol: CANTON_COIN_SYMBOL, decimals: CANTON_COIN_DECIMALS };
  }

  let total = BigInt(0);
  for (const u of utxos) {
    const amount = (u as { interfaceViewValue?: { amount?: string } }).interfaceViewValue?.amount;
    if (amount) total += BigInt(amount.split('.')[0] ?? amount);
  }
  return {
    balance: total.toString(),
    symbol: CANTON_COIN_SYMBOL,
    decimals: CANTON_COIN_DECIMALS,
  };
}

/**
 * List token holdings (UTXOs) for the current party.
 */
export async function getHoldings(config: CantonConfig): Promise<CantonHolding[]> {
  await ensureParty(config);
  const sdk = await getSDK();
  const utxos = await sdk.tokenStandard?.listHoldingUtxos(false);
  if (!utxos?.length) return [];

  const byInstrument = new Map<string, { amount: string; count: number; symbol: string }>();
  for (const u of utxos) {
    const view = (u as unknown as { interfaceViewValue?: { amount?: string; instrumentId?: string | { id?: string } } }).interfaceViewValue;
    const amount = view?.amount ?? '0';
    const rawId = view?.instrumentId;
    const instrumentId = typeof rawId === 'string' ? rawId : (rawId as { id?: string } | undefined)?.id ?? DEFAULT_INSTRUMENT_ID;
    const existing = byInstrument.get(instrumentId);
    const amtBig = BigInt(amount.split('.')[0] ?? amount);
    if (existing) {
      existing.count += 1;
      existing.amount = (BigInt(existing.amount) + amtBig).toString();
    } else {
      byInstrument.set(instrumentId, { amount: amtBig.toString(), count: 1, symbol: CANTON_COIN_SYMBOL });
    }
  }

  return Array.from(byInstrument.entries()).map(([tokenId, v]) => ({
    tokenId,
    symbol: v.symbol,
    amount: v.amount,
    registry: '',
    utxoCount: v.count,
  }));
}

/**
 * Get party info for the current configuration.
 */
export async function getPartyInfo(config: CantonConfig): Promise<CantonPartyInfo> {
  const { partyId, displayName } = await ensureParty(config);
  const useLocalNet = process.env.CANTON_USE_LOCALNET === 'true';
  const network = config.network ?? (useLocalNet ? 'localnet' : 'devnet');
  return {
    partyId,
    displayName,
    validatorUrl: getValidatorUrl(useLocalNet),
    ledgerApiUrl: getLedgerApiUrl(useLocalNet),
    network,
    isConnected: true,
  };
}

/**
 * Transfer tokens to another party (2-step: create transfer, recipient must accept).
 * Uses stored private key for signing.
 */
export async function transfer(
  config: CantonConfig,
  recipient: string,
  amount: string,
  _tokenId?: string
): Promise<CantonTransferResult> {
  const credentials = await CantonKeychain.getCredentials();
  if (!credentials?.privateKey) {
    return {
      success: false,
      transferId: '',
      recipient,
      amount,
      tokenSymbol: CANTON_COIN_SYMBOL,
      status: 'failed',
      timestamp: Date.now(),
      error: 'No Canton signing key. Use canton_configure to create or import a party with a private key.',
    };
  }

  await ensureParty(config);
  const sdk = await getSDK();
  const instrumentAdmin = await sdk.tokenStandard?.getInstrumentAdmin();
  if (!instrumentAdmin) {
    return {
      success: false,
      transferId: '',
      recipient,
      amount,
      tokenSymbol: CANTON_COIN_SYMBOL,
      status: 'failed',
      timestamp: Date.now(),
      error: 'Could not resolve instrument admin from registry.',
    };
  }

  const partyId = sdk.userLedger?.getPartyId() ?? credentials.partyId;
  const utxos = await sdk.tokenStandard?.listHoldingUtxos(false);
  const contractIds = utxos?.map((u) => (u as { contractId: string }).contractId) ?? [];

  const [transferCommand, disclosedContracts] = await sdk.tokenStandard!.createTransfer(
    partyId,
    recipient,
    amount,
    { instrumentId: DEFAULT_INSTRUMENT_ID, instrumentAdmin },
    contractIds,
    'memo-clawd'
  );

  const commandId = v4();
  await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    transferCommand,
    credentials.privateKey as import('@canton-network/core-signing-lib').PrivateKey,
    commandId,
    disclosedContracts
  );

  return {
    success: true,
    transferId: commandId,
    recipient,
    amount,
    tokenSymbol: CANTON_COIN_SYMBOL,
    status: 'confirmed',
    timestamp: Date.now(),
  };
}

/**
 * Get transaction history for the current party (from token standard holding transactions).
 */
export async function getTransactionHistory(config: CantonConfig, limit: number): Promise<CantonTransaction[]> {
  await ensureParty(config);
  const sdk = await getSDK();
  const transactions = await sdk.tokenStandard?.listHoldingTransactions(0, limit);
  if (!transactions?.transactions?.length) return [];

  const partyId = sdk.userLedger?.getPartyId() ?? '';
  const out: CantonTransaction[] = [];

  type LabelShape = { type?: string; sender?: string; receiverAmounts?: Array<{ receiver?: string; amount?: string }> };
  type TxEvent = {
    label?: LabelShape;
    unlockedHoldingsChangeSummary?: { amountChange?: string };
  };
  type TxShape = { updateId?: string; recordTime?: string; events?: TxEvent[] };

  const txList = transactions?.transactions ?? [];
  for (const tx of txList.slice(0, limit)) {
    const t = tx as TxShape;
    const updateId = t.updateId ?? '';
    const recordTime = t.recordTime ? new Date(t.recordTime).getTime() : Date.now();

    for (const ev of t.events ?? []) {
      const event = ev;
      if (!event) continue;
      const label = event.label;
      if (!label) continue;
      if (label.type === 'TransferIn') {
        const amtChange = event.unlockedHoldingsChangeSummary?.amountChange ?? '0';
        out.push({
          id: updateId,
          type: 'receive',
          counterparty: (label as LabelShape).sender ?? '',
          amount: amtChange,
          tokenSymbol: CANTON_COIN_SYMBOL,
          tokenId: DEFAULT_INSTRUMENT_ID,
          timestamp: recordTime,
          status: 'confirmed',
        });
      } else if (label.type === 'TransferOut') {
        const receiverAmounts = (label as LabelShape).receiverAmounts ?? [];
        for (const ra of receiverAmounts) {
          if (ra == null) continue;
          const recv = ra.receiver ?? '';
          const amt = ra.amount ?? '0';
          out.push({
            id: updateId,
            type: 'send',
            counterparty: recv,
            amount: amt,
            tokenSymbol: CANTON_COIN_SYMBOL,
            tokenId: DEFAULT_INSTRUMENT_ID,
            timestamp: recordTime,
            status: 'confirmed',
          });
        }
      }
    }
  }

  return out.slice(0, limit);
}

/**
 * Configure Canton: create a new external party or import partyId + optional private key.
 */
export async function configure(config: CantonConfig, args: {
  partyId?: string;
  displayName?: string;
  privateKey?: string;
}): Promise<{ success: boolean; partyId?: string; displayName?: string; message?: string; error?: string }> {
  try {
    if (!args.partyId) {
      const keyPair = createKeyPair();
      const displayName = args.displayName ?? 'clawd-wallet';
      console.warn('[Canton] configure (create party):', { displayName, hasPrivateKey: !!keyPair.privateKey });
      const sdk = await getSDK();
      const result = await sdk.userLedger?.signAndAllocateExternalParty(keyPair.privateKey, displayName);
      if (!result?.partyId) {
        return { success: false, error: 'Failed to allocate external party on Canton Network.' };
      }
      await CantonKeychain.saveCredentials({
        partyId: result.partyId,
        displayName,
        privateKey: keyPair.privateKey,
        createdAt: Date.now(),
      });
      return {
        success: true,
        partyId: result.partyId,
        displayName,
        message: `Created new Canton party: ${result.partyId}. Use canton_configure with this partyId to reuse.`,
      };
    }

    if (args.privateKey && args.partyId) {
      await CantonKeychain.saveCredentials({
        partyId: args.partyId,
        displayName: args.displayName ?? `Party (${args.partyId.slice(0, 12)}...)`,
        privateKey: args.privateKey,
        createdAt: Date.now(),
      });
      return {
        success: true,
        partyId: args.partyId,
        displayName: args.displayName,
        message: 'Canton credentials saved. You can perform transfers.',
      };
    }

    return {
      success: true,
      partyId: args.partyId,
      displayName: args.displayName,
      message: 'Canton party ID saved. For transfers, configure again with privateKey or create a new party.',
    };
  } catch (err) {
    let error = (err as Error)?.message ?? String(err);
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(error)) {
      const useLocalNet = process.env.CANTON_USE_LOCALNET === 'true';
      error += useLocalNet
        ? ' Ensure Canton LocalNet is running (see CANTON_LOCALNET.md) and ledger/validator URLs are reachable.'
        : ' For LocalNet: set CANTON_USE_LOCALNET=true and start LocalNet (see CANTON_LOCALNET.md).';
    }
    console.warn('[Canton] configure failed:', error);
    return { success: false, error: error || 'Canton configure failed (unknown error).' };
  }
}

export { getLedgerApiUrl, getValidatorUrl, getScanProxyUrl };
