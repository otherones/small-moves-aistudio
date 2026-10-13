import * as OTPAuth from 'otpauth';

export interface TotpSetupData {
  secretKey: string;
  qrCodeUrl: string;
  recoveryCodes: string[];
}

/**
 * Generates a real Base32 secret key, TOTP QR code URL, and 10 real recovery codes.
 */
export function generateTotpSetupData(accountEmail: string): TotpSetupData {
  const secret = new OTPAuth.Secret({ size: 20 });
  const secretKey = secret.base32;

  const label = accountEmail || 'user@smallmoves.org';
  const totp = new OTPAuth.TOTP({
    issuer: 'PEF Emergency Fund',
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  const qrCodeUrl = totp.toString();

  // Generate 10 real cryptographically secure random recovery codes (e.g. XXXX-XXXX)
  const recoveryCodes: string[] = [];
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let i = 0; i < 10; i++) {
    let code = '';
    for (let c = 0; c < 8; c++) {
      if (c === 4) code += '-';
      const randomByte = window.crypto.getRandomValues(new Uint8Array(1))[0];
      code += chars[randomByte % chars.length];
    }
    recoveryCodes.push(code);
  }

  return { secretKey, qrCodeUrl, recoveryCodes };
}

/**
 * Validates a 6-digit TOTP token against a Base32 secret key using RFC 6238 standard algorithm.
 */
export function verifyTotpCode(secretKey: string, token: string): boolean {
  if (!secretKey || !token || token.trim().length !== 6 || !/^\d{6}$/.test(token.trim())) {
    return false;
  }
  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'PEF Emergency Fund',
      label: 'User',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretKey.trim()),
    });

    // Validate with ±1 step (30 seconds before or after) for clock tolerance
    const delta = totp.validate({ token: token.trim(), window: 1 });
    return delta !== null;
  } catch (err) {
    console.error('TOTP verification error:', err);
    return false;
  }
}

/**
 * Normalizes a recovery code input by stripping spaces and hyphens, converting to uppercase.
 */
export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Verifies if a recovery code matches one of the user's active recovery codes.
 */
export function verifyRecoveryCode(savedCodes: string[] | undefined, inputCode: string): { valid: boolean; remainingCodes: string[] } {
  if (!savedCodes || !Array.isArray(savedCodes) || savedCodes.length === 0 || !inputCode) {
    return { valid: false, remainingCodes: savedCodes || [] };
  }

  const normalizedInput = normalizeRecoveryCode(inputCode);
  const matchedIndex = savedCodes.findIndex(
    (code) => normalizeRecoveryCode(code) === normalizedInput
  );

  if (matchedIndex === -1) {
    return { valid: false, remainingCodes: savedCodes };
  }

  // Remove used single-use recovery code
  const remainingCodes = [...savedCodes];
  remainingCodes.splice(matchedIndex, 1);

  return { valid: true, remainingCodes };
}
