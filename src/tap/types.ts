/**
 * TAP (Trusted Agent Protocol) type definitions
 */

export interface TAPCredentials {
  agentId: string;
  walletAddress: string;  // CAIP-10 format: eip155:8453:0x...
  name: string;
  keyId: string;
  identityLevel: TAPIdentityLevel;
  attestationJwt: string;
  attestationExpires: string;  // ISO 8601
  registeredAt: string;  // ISO 8601
  registryUrl: string;
}

export type TAPIdentityLevel = 'anonymous' | 'email' | 'kyc' | 'kyb';

export interface TAPAgentInfo {
  agentId: string;
  keyId: string;
  publicKey: string;
  registeredAt: string;
}

export interface TAPAttestation {
  identityLevel: TAPIdentityLevel;
  attestationJwt: string;
  issuedAt: string;
  expiresAt: string;
  issuer: string;
}

export interface TAPVerificationResult {
  status: 'verified' | 'pending' | 'failed' | 'not_started';
  agentId?: string;
  identityLevel?: TAPIdentityLevel;
  reputationScore?: number;
  verificationUrl?: string;
  error?: string;
  mockMode?: boolean;
}

export interface TAPStatus {
  verified: boolean;
  agentId?: string;
  identityLevel?: TAPIdentityLevel;
  reputationScore?: number;
  totalTransactions?: number;
  uniqueMerchants?: number;
  disputeRate?: number;
  attestationExpires?: string;
  registryUrl?: string;
  mockMode?: boolean;
}

export interface TAPRegistryChallenge {
  domain: string;
  statement?: string;
  uri?: string;
  version?: string;
  chainId?: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  expiresAt?: string;  // Alternative field name
  resources?: string[];
}

export interface TAPRegistrationResponse {
  success: boolean;
  agent: {
    id: string;
    wallet_address: string;
    name: string;
    keys: Array<{
      key_id: string;
      algorithm: string;
      is_active: boolean;
    }>;
  };
  verification_url: string;
  session_token: string;
  expires_in: number;
}

export interface TAPSignatureParams {
  method: string;
  authority: string;
  path: string;
  payment: string;
  attestation: string;
  keyId: string;
  privateKey: Uint8Array;
}

export interface TAPHeaders {
  'X-TAP-Attestation': string;
  'X-TAP-Signature-Input': string;
  'X-TAP-Signature': string;
}

export interface TAPRequirement {
  required: boolean;
  minLevel?: TAPIdentityLevel;
  registryUrl?: string;
}
