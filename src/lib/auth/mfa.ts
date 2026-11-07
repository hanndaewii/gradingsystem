/**
 * TOTP MFA Utilities
 * Implements RFC 6238 TOTP with Base32 secret generation and QR code support
 */

import { createClient } from '@/lib/supabase/server';

const TOTP_ISSUER = 'CWPC BAD Grading System';
const TOTP_ALGORITHM = 'SHA-1';
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const WINDOW_SIZE = 1; // Allow 1 period before/after for clock drift

/**
 * Generate a cryptographically secure random Base32 secret
 */
export function generateSecret(): string {
  const array = new Uint8Array(20); // 160 bits for SHA-1
  crypto.getRandomValues(array);
  return base32Encode(array);
}

/**
 * Encode bytes to Base32 (RFC 4648)
 */
function base32Encode(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  // Add padding to make length multiple of 8
  while (output.length % 8 !== 0) {
    output += '=';
  }

  return output;
}

/**
 * Decode Base32 string to bytes
 */
function base32Decode(str: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanStr = str.replace(/=/g, '').toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of cleanStr) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Generate TOTP token for a given secret and time
 */
export async function generateTOTP(secret: string, time?: number): Promise<string> {
  const key = await importKey(base32Decode(secret));
  const counter = Math.floor((time || Date.now()) / 1000 / TOTP_PERIOD);
  const counterBytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = counter & 0xff;
    counter >>>= 8;
  }

  const hmac = await crypto.subtle.sign('HMAC', key, counterBytes);
  const hmacBytes = new Uint8Array(hmac);
  const offset = hmacBytes[hmacBytes.length - 1] & 0xf;
  const code = ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff);

  const otp = code % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Import raw key for HMAC
 */
async function importKey(keyBytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: TOTP_ALGORITHM },
    false,
    ['sign']
  );
}

/**
 * Verify TOTP token with time window tolerance
 */
export async function verifyTOTP(secret: string, token: string, time?: number): Promise<boolean> {
  const currentTime = time || Date.now();

  // Check current period and adjacent periods for clock drift
  for (let i = -WINDOW_SIZE; i <= WINDOW_SIZE; i++) {
    const checkTime = currentTime + (i * TOTP_PERIOD * 1000);
    const expectedToken = await generateTOTP(secret, checkTime);
    if (expectedToken === token) {
      return true;
    }
  }

  return false;
}

/**
 * Generate otpauth:// URI for QR code
 */
export function getOTPAuthURI(email: string, secret: string): string {
  const label = encodeURIComponent(`${TOTP_ISSUER}:${email}`);
  const issuer = encodeURIComponent(TOTP_ISSUER);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=${TOTP_ALGORITHM}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

/**
 * Generate QR code as data URL (requires canvas)
 */
export async function generateQRCodeDataURL(uri: string, size = 200): Promise<string> {
  // Dynamic import to avoid SSR issues
  const QRCode = (await import('qrcode')).default;
  return QRCode.toDataURL(uri, {
    width: size,
    margin: 2,
    color: {
      dark: '#1e293b',
      light: '#ffffff',
    },
  });
}

/**
 * Format secret for display (groups of 4 characters)
 */
export function formatSecret(secret: string): string {
  return secret.replace(/=/g, '').match(/.{1,4}/g)?.join(' ') || secret;
}

/**
 * Server-side MFA operations
 */

export async function enableMFA(userId: string, secret: string): Promise<{ error: Error | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      mfa_secret: secret,
      mfa_enabled: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  return { error };
}

export async function disableMFA(userId: string): Promise<{ error: Error | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      mfa_secret: null,
      mfa_enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  return { error };
}

export async function verifyMFASetup(userId: string, token: string): Promise<{ valid: boolean; error: Error | null }> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('mfa_secret')
    .eq('id', userId)
    .single();

  if (error || !profile?.mfa_secret) {
    return { valid: false, error: error || new Error('MFA not configured') };
  }

  const valid = await verifyTOTP(profile.mfa_secret, token);
  return { valid, error: null };
}

export async function verifyMFAToken(userId: string, token: string): Promise<{ valid: boolean; error: Error | null }> {
  return verifyMFASetup(userId, token);
}

export async function getMFAStatus(userId: string): Promise<{ enabled: boolean; secret: string | null; error: Error | null }> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('mfa_enabled, mfa_secret')
    .eq('id', userId)
    .single();

  if (error) {
    return { enabled: false, secret: null, error };
  }

  return {
    enabled: profile?.mfa_enabled || false,
    secret: profile?.mfa_secret || null,
    error: null,
  };
}

/**
 * Generate backup codes for MFA recovery
 */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const array = new Uint8Array(4);
    crypto.getRandomValues(array);
    const code = Array.from(array, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }
  return codes;
}

/**
 * Hash backup code for storage (using simple hash for demo - use bcrypt in production)
 */
export async function hashBackupCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify backup code
 */
export async function verifyBackupCode(code: string, hashedCode: string): Promise<boolean> {
  const hashed = await hashBackupCode(code);
  return hashed === hashedCode;
}