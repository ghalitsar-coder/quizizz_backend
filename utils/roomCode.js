/**
 * Generate a unique room code
 * Format: 6 characters (alphanumeric, uppercase)
 */
export function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Validate room code format
 */
export function isValidRoomCode(code) {
  return /^[A-Z0-9]{6}$/.test(code);
}

