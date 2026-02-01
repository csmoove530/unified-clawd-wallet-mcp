/**
 * Balance checker for USDC on Base network
 */

import { ethers } from 'ethers';
import type { BalanceInfo } from '../types/index.js';

const USDC_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

export class BalanceChecker {
  private provider: ethers.Provider;
  private usdcContract: ethers.Contract;

  constructor(rpcUrl: string, usdcContractAddress: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.usdcContract = new ethers.Contract(usdcContractAddress, USDC_ABI, this.provider);
  }

  /**
   * Get USDC balance for an address
   */
  async getBalance(address: string): Promise<BalanceInfo> {
    try {
      const balance = await this.usdcContract.balanceOf(address);
      const decimals = await this.usdcContract.decimals();
      const symbol = await this.usdcContract.symbol();

      const formattedBalance = ethers.formatUnits(balance, decimals);

      return {
        address,
        balance: formattedBalance,
        decimals: Number(decimals),
        symbol
      };
    } catch (error) {
      throw new Error(`Failed to fetch balance: ${(error as Error).message}`);
    }
  }

  /**
   * Get raw balance (as BigInt)
   */
  async getRawBalance(address: string): Promise<bigint> {
    try {
      return await this.usdcContract.balanceOf(address);
    } catch (error) {
      throw new Error(`Failed to fetch raw balance: ${(error as Error).message}`);
    }
  }

  /**
   * Check if address has sufficient balance
   */
  async hasSufficientBalance(address: string, requiredAmount: number): Promise<boolean> {
    try {
      const balance = await this.getBalance(address);
      return parseFloat(balance.balance) >= requiredAmount;
    } catch (error) {
      return false;
    }
  }
}
