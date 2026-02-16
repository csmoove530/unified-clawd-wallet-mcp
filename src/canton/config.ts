/**
 * Canton DevNet and custom endpoint configuration.
 * Uses environment variables for DevNet; falls back to LocalNet URLs for local testing.
 */

export type CantonNetwork = 'devnet' | 'testnet' | 'mainnet' | 'localnet';

/**
 * Default Canton DevNet public endpoints (Digital Asset).
 * Override with CANTON_LEDGER_API_URL and CANTON_VALIDATOR_URL for custom deployments.
 */
const DEVNET_LEDGER_DEFAULT = 'https://canton-devnet.digitalasset.com/ledger/v1';
const DEVNET_VALIDATOR_DEFAULT = 'https://canton-devnet.digitalasset.com/api/v1';

/**
 * LocalNet defaults (Splice).
 * Ledger: App User JSON API port 2975. Validator: App User validator base URL (port 2903, path /api/validator).
 */
const LOCALNET_LEDGER_DEFAULT = 'http://127.0.0.1:2975';
const LOCALNET_VALIDATOR_DEFAULT = 'http://127.0.0.1:2903/api/validator';

export function getLedgerApiUrl(useLocalNet?: boolean): string {
  const local = useLocalNet ?? process.env.CANTON_USE_LOCALNET === 'true';
  if (local) {
    return process.env.CANTON_LEDGER_API_URL ?? LOCALNET_LEDGER_DEFAULT;
  }
  return process.env.CANTON_LEDGER_API_URL ?? DEVNET_LEDGER_DEFAULT;
}

export function getValidatorUrl(useLocalNet?: boolean): string {
  const local = useLocalNet ?? process.env.CANTON_USE_LOCALNET === 'true';
  if (local) {
    return process.env.CANTON_VALIDATOR_URL ?? LOCALNET_VALIDATOR_DEFAULT;
  }
  return process.env.CANTON_VALIDATOR_URL ?? DEVNET_VALIDATOR_DEFAULT;
}

/** Scan proxy = validator + /v0/scan-proxy (used for topology and token registry). */
export function getScanProxyUrl(useLocalNet?: boolean): string {
  const base = getValidatorUrl(useLocalNet);
  return base.replace(/\/?$/, '') + '/v0/scan-proxy';
}
