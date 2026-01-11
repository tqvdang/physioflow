/**
 * Vietnamese mobile carrier information
 */
export type VietnameseCarrier = 'Viettel' | 'Mobifone' | 'Vinaphone' | 'Vietnamobile' | 'Gmobile' | 'Unknown';

/**
 * Carrier prefix mappings (after converting to 10-digit format)
 */
const CARRIER_PREFIXES: Record<string, VietnameseCarrier> = {
  // Viettel
  '086': 'Viettel',
  '096': 'Viettel',
  '097': 'Viettel',
  '098': 'Viettel',
  '032': 'Viettel',
  '033': 'Viettel',
  '034': 'Viettel',
  '035': 'Viettel',
  '036': 'Viettel',
  '037': 'Viettel',
  '038': 'Viettel',
  '039': 'Viettel',
  // Mobifone
  '089': 'Mobifone',
  '090': 'Mobifone',
  '093': 'Mobifone',
  '070': 'Mobifone',
  '076': 'Mobifone',
  '077': 'Mobifone',
  '078': 'Mobifone',
  '079': 'Mobifone',
  // Vinaphone
  '088': 'Vinaphone',
  '091': 'Vinaphone',
  '094': 'Vinaphone',
  '081': 'Vinaphone',
  '082': 'Vinaphone',
  '083': 'Vinaphone',
  '084': 'Vinaphone',
  '085': 'Vinaphone',
  // Vietnamobile
  '092': 'Vietnamobile',
  '056': 'Vietnamobile',
  '058': 'Vietnamobile',
  // Gmobile
  '099': 'Gmobile',
  '059': 'Gmobile',
};

/**
 * Format Vietnamese phone number to standard format (0XXX-XXX-XXX)
 */
export function formatPhone(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);

  if (!cleaned || cleaned.length < 10) {
    return phone;
  }

  // Convert to 10-digit format if it starts with 84
  let normalized = cleaned;
  if (cleaned.startsWith('84') && cleaned.length === 11) {
    normalized = '0' + cleaned.slice(2);
  }

  if (normalized.length !== 10) {
    return phone;
  }

  // Format as 0XXX-XXX-XXX
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 7)}-${normalized.slice(7)}`;
}

/**
 * Parse phone number to normalized format (10 digits starting with 0)
 */
export function parsePhone(phone: string): string | null {
  const cleaned = cleanPhoneNumber(phone);

  if (!cleaned) {
    return null;
  }

  // Handle +84 or 84 prefix
  if (cleaned.startsWith('84') && cleaned.length === 11) {
    return '0' + cleaned.slice(2);
  }

  // Already in correct format
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return cleaned;
  }

  return null;
}

/**
 * Validate Vietnamese phone number
 */
export function validateVietnamesePhone(phone: string): boolean {
  const parsed = parsePhone(phone);

  if (!parsed) {
    return false;
  }

  // Check if prefix is valid
  const prefix = parsed.slice(0, 3);
  return prefix in CARRIER_PREFIXES;
}

/**
 * Get carrier from phone number
 */
export function getCarrier(phone: string): VietnameseCarrier {
  const parsed = parsePhone(phone);

  if (!parsed) {
    return 'Unknown';
  }

  const prefix = parsed.slice(0, 3);
  return CARRIER_PREFIXES[prefix] ?? 'Unknown';
}

/**
 * Remove all non-digit characters from phone number
 */
function cleanPhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  return cleaned;
}
