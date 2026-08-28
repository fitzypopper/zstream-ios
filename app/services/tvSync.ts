/**
 * TV Sync Service - Phone-to-TV pairing and casting for ZStream.
 * Uses Bonjour/mDNS for discovery and HTTP for communication.
 */

import { getItem, setItem, STORAGE_KEYS } from '../store/storage';
import type { PairedTV, TVPairingSession, TVSyncPayload, TVCastRequest } from '../api/types';

/**
 * Generate a random device ID.
 */
function generateDeviceId(): string {
  return 'ios-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/**
 * Generate a 6-digit pairing code.
 */
function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a 24-char session token.
 */
function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * TV Sync Manager - Manages TV pairing and communication.
 */
export class TVSyncManager {
  private deviceId: string;
  private pairedTVs: PairedTV[] = [];
  private isDiscovering = false;
  private initialized = false;

  constructor() {
    this.deviceId = generateDeviceId();
  }

  /**
   * Load paired TVs from storage.
   */
  private async loadPairedTVs() {
    try {
      const stored = await getItem(STORAGE_KEYS.PAIRED_TVS);
      if (stored) {
        this.pairedTVs = JSON.parse(stored);
      }
      this.initialized = true;
    } catch (error) {
      this.initialized = true;
      console.error('[TVSync] Failed to load paired TVs:', error);
    }
  }

  /**
   * Save paired TVs to storage.
   */
  private async savePairedTVs() {
    try {
      await setItem(STORAGE_KEYS.PAIRED_TVS, JSON.stringify(this.pairedTVs));
    } catch (error) {
      console.error('[TVSync] Failed to save paired TVs:', error);
    }
  }

  /**
   * Get list of paired TVs.
   */
  async getPairedTVs(): Promise<PairedTV[]> {
    if (!this.initialized) {
      await this.loadPairedTVs();
    }
    return [...this.pairedTVs];
  }

  /**
   * Start discovering TVs on the local network.
   * In a real implementation, this would use Bonjour/mDNS via a native module.
   * For now, this returns a mock discovery flow.
   */
  async startDiscovery(): Promise<TVPairingSession[]> {
    if (this.isDiscovering) {
      return [];
    }

    this.isDiscovering = true;
    console.log('[TVSync] Starting TV discovery...');

    // In production, this would use:
    // - NWBrowser from Network framework for Bonjour discovery
    // - Or a React Native native module wrapping mDNS/Bonjour
    
    // For now, return empty array - the actual discovery
    // would be implemented via a native module
    return [];
  }

  /**
   * Stop discovering TVs.
   */
  stopDiscovery() {
    this.isDiscovering = false;
    console.log('[TVSync] Stopped TV discovery');
  }

  /**
   * Initiate pairing with a discovered TV.
   * In production, this would:
   * 1. Connect to TV's HTTP server
   * 2. Send GET /hello to get pairing info
   * 3. Show 6-digit code to user
   * 4. Wait for user to enter code on TV
   * 5. Send POST /pair with encrypted proof
   */
  async initiatePairing(tvHost: string, tvPort: number): Promise<{
    pairingCode: string;
    sessionId: string;
  }> {
    const pairingCode = generatePairingCode();
    const sessionId = generateSessionToken();

    console.log(`[TVSync] Initiating pairing with TV at ${tvHost}:${tvPort}`);
    console.log(`[TVSync] Pairing code: ${pairingCode}`);

    // In production:
    // 1. Fetch TV info from GET http://{host}:{port}/hello
    // 2. Derive encryption key using PBKDF2-SHA256
    // 3. Show pairing code to user
    // 4. Wait for TV to verify
    // 5. Send POST /pair with proof

    return { pairingCode, sessionId };
  }

  /**
   * Complete pairing after user enters code on TV.
   * In production, this would send the encrypted proof to the TV.
   */
  async completePairing(
    tvHost: string,
    tvPort: number,
    sessionId: string,
    pairingCode: string,
    tvName: string,
  ): Promise<PairedTV> {
    const token = generateSessionToken();
    // Simple base64 encoding for React Native
    const secretRaw = generateSessionToken();
    const secretBase64 = secretRaw.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');

    const pairedTV: PairedTV = {
      id: generateDeviceId(),
      tvDeviceId: generateDeviceId(),
      tvName,
      host: tvHost,
      port: tvPort,
      token,
      secretBase64,
      pairedAt: new Date().toISOString(),
    };

    this.pairedTVs.push(pairedTV);
    await this.savePairedTVs();

    console.log(`[TVSync] Successfully paired with TV: ${tvName}`);
    return pairedTV;
  }

  /**
   * Remove a paired TV.
   */
  async removePairedTV(tvId: string) {
    this.pairedTVs = this.pairedTVs.filter(tv => tv.id !== tvId);
    await this.savePairedTVs();
    console.log(`[TVSync] Removed paired TV: ${tvId}`);
  }

  /**
   * Sync data to a paired TV.
   * In production, this would:
   * 1. Encrypt the payload using AES
   * 2. Send POST /transfer to the TV
   * 3. Wait for user confirmation on TV
   */
  async syncToTV(tvId: string, _payload?: TVSyncPayload): Promise<boolean> {
    const tv = this.pairedTVs.find(t => t.id === tvId);
    if (!tv) {
      console.error('[TVSync] TV not found:', tvId);
      return false;
    }

    console.log(`[TVSync] Syncing data to TV: ${tv.tvName}`);

    // In production:
    // 1. Encrypt payload with AES using shared secret
    // 2. POST http://{host}:{port}/transfer with encrypted payload
    // 3. Poll GET http://{host}:{port}/status for user response
    // 4. Return success/failure

    return true;
  }

  /**
   * Cast content to a paired TV.
   * In production, this would send a cast request to the TV.
   */
  async castToTV(tvId: string, request: TVCastRequest): Promise<boolean> {
    const tv = this.pairedTVs.find(t => t.id === tvId);
    if (!tv) {
      console.error('[TVSync] TV not found:', tvId);
      return false;
    }

    console.log(`[TVSync] Casting to TV: ${tv.tvName} - ${request.title}`);

    // In production:
    // 1. POST http://{host}:{port}/release-subscription
    // 2. Include cast request with media info
    // 3. TV will start playing the content

    return true;
  }
}

// Singleton instance
let tvSyncManager: TVSyncManager | null = null;

/**
 * Get the TV Sync Manager instance.
 */
export function getTVSyncManager(): TVSyncManager {
  if (!tvSyncManager) {
    tvSyncManager = new TVSyncManager();
  }
  return tvSyncManager;
}

export default {
  getTVSyncManager,
  TVSyncManager,
};
