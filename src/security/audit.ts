/**
 * Audit logging for security and compliance
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const AUDIT_LOG = join(homedir(), '.clawd', 'audit.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

export type AuditAction =
  | 'payment_approved'
  | 'payment_executed'
  | 'payment_failed'
  | 'payment_error'
  | 'config_changed'
  | 'wallet_created'
  | 'wallet_exported'
  | 'limit_exceeded'
  | 'tap_verified'
  | 'tap_registered'
  | 'tap_revoked'
  | 'tap_headers_included'
  | 'tap_headers_skipped'
  | 'referral_redeemed'
  | 'referral_redemption_failed';

export interface AuditEntry {
  timestamp: string;
  action: AuditAction;
  details: Record<string, any>;
}

export class AuditLogger {
  /**
   * Ensure audit directory exists
   */
  private static async ensureDirectory(): Promise<void> {
    const dir = join(homedir(), '.clawd');
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Log an audit entry
   */
  static async logAction(action: AuditAction, details: Record<string, any>): Promise<void> {
    await this.ensureDirectory();

    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      action,
      details
    };

    const logLine = JSON.stringify(entry) + '\n';

    try {
      await fs.appendFile(AUDIT_LOG, logLine, 'utf-8');
      await this.rotateIfNeeded();
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Rotate log file if it exceeds max size
   */
  private static async rotateIfNeeded(): Promise<void> {
    try {
      const stats = await fs.stat(AUDIT_LOG);

      if (stats.size > MAX_LOG_SIZE) {
        const backupPath = `${AUDIT_LOG}.${Date.now()}`;
        await fs.rename(AUDIT_LOG, backupPath);

        // Keep only last 5 backup files
        const dir = join(homedir(), '.clawd');
        const files = await fs.readdir(dir);
        const backups = files
          .filter(f => f.startsWith('audit.log.'))
          .sort()
          .reverse();

        for (let i = 5; i < backups.length; i++) {
          await fs.unlink(join(dir, backups[i]));
        }
      }
    } catch (error) {
      // Ignore errors in rotation
    }
  }

  /**
   * Read audit log
   */
  static async readLog(limit?: number): Promise<AuditEntry[]> {
    try {
      const content = await fs.readFile(AUDIT_LOG, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line);
      const entries = lines.map(line => JSON.parse(line) as AuditEntry);

      return limit ? entries.slice(-limit) : entries;
    } catch (error) {
      return [];
    }
  }
}
