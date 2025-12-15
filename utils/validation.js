/**
 * Validate UUID format
 */
export function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Validate and sanitize UUID
 */
export function validateUUID(value, fieldName = 'ID') {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }
  
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  
  if (!isValidUUID(value)) {
    throw new Error(`${fieldName} must be a valid UUID format`);
  }
  
  return value;
}

