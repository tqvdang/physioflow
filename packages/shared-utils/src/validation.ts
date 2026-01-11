/**
 * Validate Medical Record Number (MRN)
 * Format: Alphanumeric, typically 6-12 characters
 * Example: "MRN-123456" or "BN000001"
 */
export function isValidMRN(mrn: string): boolean {
  if (!mrn || typeof mrn !== 'string') {
    return false;
  }

  const trimmed = mrn.trim();

  // Must be 4-20 characters
  if (trimmed.length < 4 || trimmed.length > 20) {
    return false;
  }

  // Must contain only alphanumeric characters and hyphens
  const mrnPattern = /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/;
  return mrnPattern.test(trimmed);
}

/**
 * Validate Vietnamese Health Insurance Card (BHYT) number
 * Format: 2 letters + 1 digit + 12 digits = 15 characters
 * Example: "DN4123456789012"
 * Structure:
 * - 2 letters: Province code
 * - 1 digit: Object type (1-5)
 * - 2 digits: Sub-category
 * - 10 digits: Personal ID
 */
export function isValidBHYTCard(cardNumber: string): boolean {
  if (!cardNumber || typeof cardNumber !== 'string') {
    return false;
  }

  const trimmed = cardNumber.trim().toUpperCase();

  // Must be exactly 15 characters
  if (trimmed.length !== 15) {
    return false;
  }

  // Pattern: 2 letters + 13 digits
  const bhytPattern = /^[A-Z]{2}\d{13}$/;
  if (!bhytPattern.test(trimmed)) {
    return false;
  }

  // Validate province code (first 2 letters)
  const validProvinceCodes = [
    'DN', 'HN', 'HCM', 'HP', 'CT', // Major cities
    'AG', 'BG', 'BD', 'BK', 'BL', 'BN', 'BP', 'BR', 'BT', 'BV',
    'CM', 'CB', 'DL', 'DK', 'DB', 'GL', 'HG', 'HD', 'HB', 'HT',
    'HY', 'KH', 'KG', 'KT', 'LA', 'LD', 'LS', 'LC', 'LG', 'NA',
    'NB', 'NT', 'ND', 'PT', 'PY', 'QB', 'QN', 'QT', 'ST', 'SL',
    'TN', 'TG', 'TH', 'TB', 'TV', 'TQ', 'VP', 'VL', 'YB',
  ];

  const provinceCode = trimmed.slice(0, 2);
  if (!validProvinceCodes.includes(provinceCode)) {
    // Allow any 2-letter code as there might be new codes
    // Just ensure it's valid letters
    return /^[A-Z]{2}$/.test(provinceCode);
  }

  return true;
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmed = email.trim().toLowerCase();

  // Basic length check
  if (trimmed.length < 5 || trimmed.length > 254) {
    return false;
  }

  // RFC 5322 compliant email regex (simplified)
  const emailPattern = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

  return emailPattern.test(trimmed);
}

/**
 * Validate date string or Date object
 * Accepts: Date object, ISO string, or DD/MM/YYYY format
 */
export function isValidDate(date: Date | string | number): boolean {
  if (date === null || date === undefined) {
    return false;
  }

  let dateObj: Date;

  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'number') {
    dateObj = new Date(date);
  } else if (typeof date === 'string') {
    // Try DD/MM/YYYY format first
    const ddmmyyyyPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = date.match(ddmmyyyyPattern);

    if (match) {
      const day = parseInt(match[1] ?? '0', 10);
      const month = parseInt(match[2] ?? '0', 10) - 1;
      const year = parseInt(match[3] ?? '0', 10);
      dateObj = new Date(year, month, day);

      // Verify the date components match (handles invalid dates like 31/02/2024)
      if (
        dateObj.getDate() !== day ||
        dateObj.getMonth() !== month ||
        dateObj.getFullYear() !== year
      ) {
        return false;
      }
    } else {
      // Try ISO format
      dateObj = new Date(date);
    }
  } else {
    return false;
  }

  // Check if date is valid
  return !isNaN(dateObj.getTime());
}
