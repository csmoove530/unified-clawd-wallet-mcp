#!/usr/bin/env node
/**
 * CLAWD CLI - wallet initialization and utilities
 */

import { Command } from 'commander';
import { WalletManager } from '../wallet/manager.js';
import { ConfigManager } from '../config/manager.js';
import { Keychain } from '../wallet/keychain.js';

const program = new Command();

program
  .name('clawd')
  .description('CLAWD Wallet CLI')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize wallet: create a new key, save to keychain, and write config')
  .option('-f, --force', 'Overwrite existing wallet and config')
  .action(async (opts: { force?: boolean }) => {
    const configExists = await ConfigManager.exists();
    const keyExists = await Keychain.hasPrivateKey();
    if (configExists && keyExists && !opts.force) {
      console.error('Wallet already initialized. Use --force to overwrite.');
      process.exit(1);
    }
    const walletManager = new WalletManager();
    walletManager.generateWallet();
    const address = walletManager.getAddress();
    await walletManager.saveToKeychain();
    await ConfigManager.initializeConfig(address);
    console.log('Wallet initialized.');
    console.log('Address:', address);
  });

program.parse();
