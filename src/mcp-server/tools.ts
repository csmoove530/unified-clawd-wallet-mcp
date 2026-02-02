/**
 * MCP tool implementations for unified CLAWD Wallet
 */

import { WalletManager } from '../wallet/manager.js';
import { BalanceChecker } from '../wallet/balance.js';
import { TransactionHistory } from '../wallet/history.js';
import { PaymentHandler } from '../x402/payment.js';
import { ServiceDiscovery } from '../x402/discovery.js';
import { ConfigManager } from '../config/manager.js';
import { SpendLimits } from '../security/limits.js';
import { AuditLogger } from '../security/audit.js';
import { TAPCredentialManager, TAPRegistry, TAPIdentityLevel } from '../tap/index.js';
import { ReferralManager, Treasury } from '../referral/index.js';
import type { PaymentRequest } from '../types/index.js';

// Domain handlers
import {
  handleDomainSearch,
  handleDomainPurchase,
  handleDomainConfirm,
  handleDomainList,
  handleDnsList,
  handleDnsCreate,
  handleDnsDelete,
  handleNameservers,
  handleAuthCode,
} from '../domains/handlers.js';

export class MCPTools {
  // ============================================================================
  // WALLET TOOLS
  // ============================================================================

  /**
   * Tool: x402_payment_request
   * Make an x402 payment request to a service
   */
  static async paymentRequest(args: PaymentRequest): Promise<any> {
    try {
      const { url, method, description, maxAmount, body } = args;

      // Validate max amount if provided
      if (maxAmount) {
        const validation = await SpendLimits.validateTransaction(maxAmount);
        if (!validation.valid) {
          return {
            success: false,
            error: validation.errors.join(', '),
          };
        }
      }

      // Execute payment
      const handler = new PaymentHandler();
      await handler.initialize();

      const result = await handler.executePayment(url, method, body, description);

      return result;
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Tool: x402_check_balance
   * Check current USDC balance
   */
  static async checkBalance(): Promise<any> {
    try {
      const config = await ConfigManager.loadConfig();
      const walletManager = new WalletManager();
      await walletManager.loadFromKeychain();

      const balanceChecker = new BalanceChecker(
        config.wallet.rpcUrl,
        config.wallet.usdcContract
      );

      const balance = await balanceChecker.getBalance(walletManager.getAddress());

      return {
        success: true,
        balance: {
          address: balance.address,
          amount: balance.balance,
          currency: balance.symbol,
          decimals: balance.decimals,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Tool: x402_get_address
   * Get wallet address for funding
   */
  static async getAddress(): Promise<any> {
    try {
      const config = await ConfigManager.loadConfig();

      return {
        success: true,
        address: config.wallet.address,
        network: config.wallet.network,
        fundingInstructions: 'Send USDC on Base network to this address',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Tool: x402_transaction_history
   * Get recent transaction history
   */
  static async transactionHistory(limit: number = 10): Promise<any> {
    try {
      const history = await TransactionHistory.getHistory(limit);

      return {
        success: true,
        transactions: history,
        count: history.length,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Tool: x402_discover_services
   * Discover available x402 services
   */
  static async discoverServices(category?: string, query?: string): Promise<any> {
    try {
      const services = await ServiceDiscovery.discoverServices(query, category);

      return {
        success: true,
        services,
        count: services.length,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // ============================================================================
  // SECURITY TOOLS
  // ============================================================================

  /**
   * Tool: x402_get_spending_controls
   * Get current spending controls and limits
   */
  static async getSpendingControls(): Promise<any> {
    try {
      const config = await ConfigManager.loadConfig();
      const dailySpend = await SpendLimits.getDailySpend();

      return {
        success: true,
        controls: {
          maxTransactionAmount: config.security.maxTransactionAmount,
          autoApproveUnder: config.security.autoApproveUnder,
          dailyLimit: config.security.dailyLimit,
        },
        usage: {
          spentToday: dailySpend,
          remainingDaily: Math.max(0, config.security.dailyLimit - dailySpend),
        },
        description: {
          maxTransactionAmount: 'Maximum USDC allowed per single transaction',
          autoApproveUnder: 'Transactions under this amount are auto-approved without prompt',
          dailyLimit: 'Maximum total USDC that can be spent in 24 hours',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Tool: x402_update_spending_controls
   * Update spending controls and limits
   */
  static async updateSpendingControls(args: {
    maxTransactionAmount?: number;
    autoApproveUnder?: number;
    dailyLimit?: number;
  }): Promise<any> {
    try {
      const { maxTransactionAmount, autoApproveUnder, dailyLimit } = args;

      // Must provide at least one parameter
      if (maxTransactionAmount === undefined && autoApproveUnder === undefined && dailyLimit === undefined) {
        return {
          success: false,
          error: 'Please provide at least one setting to update: maxTransactionAmount, autoApproveUnder, or dailyLimit',
        };
      }

      // Load current config
      const config = await ConfigManager.loadConfig();
      const previousValues = { ...config.security };

      // Validate and update each provided value
      if (maxTransactionAmount !== undefined) {
        if (maxTransactionAmount <= 0) {
          return { success: false, error: 'maxTransactionAmount must be positive' };
        }
        config.security.maxTransactionAmount = maxTransactionAmount;
      }

      if (autoApproveUnder !== undefined) {
        if (autoApproveUnder < 0) {
          return { success: false, error: 'autoApproveUnder cannot be negative' };
        }
        config.security.autoApproveUnder = autoApproveUnder;
      }

      if (dailyLimit !== undefined) {
        if (dailyLimit <= 0) {
          return { success: false, error: 'dailyLimit must be positive' };
        }
        config.security.dailyLimit = dailyLimit;
      }

      // Save updated config
      await ConfigManager.saveConfig(config);

      // Log the change
      await AuditLogger.logAction('config_changed', {
        section: 'security',
        previous: previousValues,
        updated: config.security,
      });

      return {
        success: true,
        message: 'Spending controls updated successfully',
        previous: previousValues,
        current: config.security,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // ============================================================================
  // REFERRAL TOOLS
  // ============================================================================

  /**
   * Tool: x402_redeem_referral
   * Redeem a referral code for free USDC
   */
  static async redeemReferral(args: { code: string }): Promise<any> {
    try {
      const { code } = args;

      // Get user wallet address
      const config = await ConfigManager.loadConfig();
      const userAddress = config.wallet.address;

      // Initialize referral manager
      const referralManager = new ReferralManager();

      // Validate the code
      const validation = referralManager.validateCode(code);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Invalid referral code',
        };
      }

      const referralCode = validation.referralCode!;

      // Check if this address has already redeemed
      if (referralManager.hasAddressRedeemed(userAddress)) {
        return {
          success: false,
          error: 'This wallet has already redeemed a referral code',
          alreadyRedeemed: true,
        };
      }

      // Initialize treasury
      const treasury = new Treasury();
      const treasuryLoaded = await treasury.loadFromEnvOrKeychain();

      if (!treasuryLoaded) {
        return {
          success: false,
          error: 'Treasury not configured. Contact support.',
        };
      }

      // Check treasury balance
      const hasFunds = await treasury.hasSufficientBalance(referralCode.amount);
      if (!hasFunds) {
        return {
          success: false,
          error: 'Treasury has insufficient balance. Please try again later.',
        };
      }

      // Execute transfer
      const result = await treasury.transfer(userAddress, referralCode.amount);

      if (!result.success) {
        await AuditLogger.logAction('referral_redemption_failed', {
          code: code.toUpperCase(),
          address: userAddress,
          amount: referralCode.amount,
          error: result.error,
        });

        return {
          success: false,
          error: result.error || 'Transfer failed',
        };
      }

      // Mark code as redeemed
      referralManager.markRedeemed(code, userAddress, result.txHash!);

      // Log success
      await AuditLogger.logAction('referral_redeemed', {
        code: code.toUpperCase(),
        address: userAddress,
        amount: referralCode.amount,
        txHash: result.txHash,
      });

      return {
        success: true,
        code: code.toUpperCase(),
        amount: referralCode.amount,
        currency: 'USDC',
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        recipientAddress: userAddress,
        explorerUrl: Treasury.getExplorerUrl(result.txHash!),
        message: `Successfully redeemed $${referralCode.amount} USDC! Check your balance with x402_check_balance.`,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // ============================================================================
  // TAP TOOLS
  // ============================================================================

  /**
   * Tool: tap_register_agent
   * Register this wallet as a TAP agent
   */
  static async registerAgent(args: { name?: string }): Promise<any> {
    try {
      const walletManager = new WalletManager();
      await walletManager.loadFromKeychain();

      const walletAddress = walletManager.getAddress();
      const privateKey = await walletManager.exportPrivateKey();
      const name = args.name || `Clawd Agent (${walletAddress.slice(0, 8)})`;

      // Check if already registered
      const isConfigured = await TAPCredentialManager.isConfigured();
      if (isConfigured) {
        const status = await TAPCredentialManager.getStatus();
        return {
          success: true,
          status: 'already_registered',
          agentId: status.agentId,
          message: 'Agent is already registered. Use tap_verify_identity to verify or tap_revoke to re-register.',
        };
      }

      // Register with TAP
      const registry = new TAPRegistry();
      const registration = await registry.registerAgent({
        walletAddress,
        walletPrivateKey: privateKey,
        name,
      });

      await AuditLogger.logAction('tap_registered', {
        agentId: registration.agentId,
        walletAddress,
        mockMode: registration.mockMode,
      });

      return {
        success: true,
        status: 'registered',
        agentId: registration.agentId,
        verificationUrl: registration.verificationUrl,
        mockMode: registration.mockMode || registry.isMockMode(),
        message: registration.mockMode
          ? `[DEMO MODE] Agent registered as "${name}". Use tap_verify_identity to complete verification.`
          : `Agent registered as "${name}". Use tap_verify_identity to complete verification.`,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Tool: tap_verify_identity
   * Complete TAP identity verification for premium merchant access
   */
  static async verifyIdentity(args: { level?: string; name?: string }): Promise<any> {
    try {
      const level = (args.level as TAPIdentityLevel) || 'kyc';
      const walletManager = new WalletManager();
      await walletManager.loadFromKeychain();

      const walletAddress = walletManager.getAddress();
      const privateKey = await walletManager.exportPrivateKey();
      const name = args.name || `Clawd Agent (${walletAddress.slice(0, 8)})`;

      // Check if already verified
      const isVerified = await TAPCredentialManager.isVerified();
      if (isVerified) {
        const status = await TAPCredentialManager.getStatus();
        return {
          success: true,
          status: 'already_verified',
          agentId: status.agentId,
          identityLevel: status.identityLevel,
          message: `Already verified at ${status.identityLevel?.toUpperCase()} level`,
        };
      }

      // Register if not already registered
      const registry = new TAPRegistry();
      let agentId: string;

      const agent = await TAPCredentialManager.loadAgent();
      if (agent) {
        agentId = agent.agentId;
      } else {
        const registration = await registry.registerAgent({
          walletAddress,
          walletPrivateKey: privateKey,
          name,
        });
        agentId = registration.agentId;
      }

      // Complete verification (demo mode for MCP context - no browser)
      const result = await registry.completeVerificationDemo(agentId, level);

      if (result.status !== 'verified') {
        return {
          success: false,
          error: result.error || 'Verification failed',
        };
      }

      await AuditLogger.logAction('tap_verified', {
        agentId,
        level,
        walletAddress,
        mockMode: result.mockMode,
      });

      return {
        success: true,
        status: 'verified',
        agentId,
        identityLevel: level,
        reputationScore: result.reputationScore,
        mockMode: result.mockMode || registry.isMockMode(),
        message: result.mockMode
          ? `[DEMO MODE] Identity verified at ${level.toUpperCase()} level. In production, TAP headers will be added to x402 payments.`
          : `Identity verified at ${level.toUpperCase()} level. Premium merchants will now accept your payments.`,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Tool: tap_get_status
   * Get current TAP verification status and reputation
   */
  static async getTapStatus(): Promise<any> {
    try {
      const status = await TAPCredentialManager.getStatus();

      if (!status.verified && !status.agentId) {
        return {
          success: true,
          verified: false,
          message:
            'Not registered. Use tap_register_agent to register, then tap_verify_identity to verify.',
        };
      }

      // Try to get reputation
      let reputationScore: number | undefined;
      let mockMode = false;
      if (status.verified && status.agentId) {
        try {
          const registry = new TAPRegistry(status.registryUrl);
          mockMode = registry.isMockMode();
          const reputation = await registry.getReputation(status.agentId);
          reputationScore = reputation?.reputationScore;
        } catch {
          // Silently fail reputation lookup
        }
      }

      // Check if registry URL indicates mock mode
      if (status.registryUrl?.startsWith('mock://')) {
        mockMode = true;
      }

      return {
        success: true,
        verified: status.verified,
        agentId: status.agentId,
        identityLevel: status.identityLevel,
        reputationScore,
        attestationExpires: status.attestationExpires,
        registryUrl: status.registryUrl,
        mockMode,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Tool: tap_revoke
   * Revoke TAP credentials and remove from registry
   */
  static async revokeAgent(): Promise<any> {
    try {
      const agent = await TAPCredentialManager.loadAgent();

      if (!agent) {
        return {
          success: true,
          status: 'not_registered',
          message: 'No TAP agent registered. Nothing to revoke.',
        };
      }

      const registry = new TAPRegistry(agent.registryUrl);
      const result = await registry.revokeAgent(agent.agentId);

      await AuditLogger.logAction('tap_revoked', {
        agentId: agent.agentId,
      });

      if (result.error) {
        return {
          success: true,
          status: 'revoked_locally',
          message: `Local credentials deleted. ${result.error}`,
        };
      }

      return {
        success: true,
        status: 'revoked',
        message: 'TAP credentials revoked and agent removed from registry.',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // ============================================================================
  // DOMAIN TOOLS
  // ============================================================================

  /**
   * Tool: clawd_domain_search
   */
  static async domainSearch(args: { query: string; tlds?: string[] }): Promise<string> {
    return handleDomainSearch(args);
  }

  /**
   * Tool: clawd_domain_purchase
   */
  static async domainPurchase(args: {
    domain: string;
    years?: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;
  }): Promise<string> {
    return handleDomainPurchase(args);
  }

  /**
   * Tool: clawd_domain_confirm
   */
  static async domainConfirm(args: { purchase_id: string; tx_hash: string }): Promise<string> {
    return handleDomainConfirm(args);
  }

  /**
   * Tool: clawd_domain_list
   */
  static async domainList(args: { wallet: string }): Promise<string> {
    return handleDomainList(args);
  }

  /**
   * Tool: clawd_dns_list
   */
  static async dnsList(args: { domain: string; wallet: string }): Promise<string> {
    return handleDnsList(args);
  }

  /**
   * Tool: clawd_dns_create
   */
  static async dnsCreate(args: {
    domain: string;
    wallet: string;
    record_type: string;
    name: string;
    content: string;
    ttl?: number;
  }): Promise<string> {
    return handleDnsCreate(args);
  }

  /**
   * Tool: clawd_dns_delete
   */
  static async dnsDelete(args: {
    domain: string;
    wallet: string;
    record_id: string;
  }): Promise<string> {
    return handleDnsDelete(args);
  }

  /**
   * Tool: clawd_domain_nameservers
   */
  static async domainNameservers(args: {
    domain: string;
    wallet: string;
    nameservers: string[];
  }): Promise<string> {
    return handleNameservers(args);
  }

  /**
   * Tool: clawd_domain_auth_code
   */
  static async domainAuthCode(args: { domain: string; wallet: string }): Promise<string> {
    return handleAuthCode(args);
  }
}
