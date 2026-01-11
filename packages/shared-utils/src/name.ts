/**
 * Parsed Vietnamese name structure
 */
export interface ParsedVietnameseName {
  familyName: string;
  middleName: string;
  givenName: string;
  fullName: string;
}

/**
 * Format a Vietnamese name (family name first)
 * Input: { familyName: "Nguyen", middleName: "Van", givenName: "An" }
 * Output: "Nguyen Van An"
 */
export function formatVietnameseName(
  familyName: string,
  middleName?: string,
  givenName?: string
): string {
  const parts = [familyName, middleName, givenName].filter(Boolean);
  return parts.join(' ');
}

/**
 * Parse a Vietnamese full name into components
 * Assumes format: "Family Middle Given" (e.g., "Nguyen Van An")
 * Vietnamese names typically have family name first, given name last
 */
export function parseVietnameseName(fullName: string): ParsedVietnameseName {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) {
    return {
      familyName: '',
      middleName: '',
      givenName: '',
      fullName: '',
    };
  }

  if (parts.length === 1) {
    return {
      familyName: parts[0] ?? '',
      middleName: '',
      givenName: '',
      fullName: parts[0] ?? '',
    };
  }

  if (parts.length === 2) {
    return {
      familyName: parts[0] ?? '',
      middleName: '',
      givenName: parts[1] ?? '',
      fullName: trimmed,
    };
  }

  // For 3+ parts: first is family, last is given, middle is everything in between
  const familyName = parts[0] ?? '';
  const givenName = parts[parts.length - 1] ?? '';
  const middleName = parts.slice(1, -1).join(' ');

  return {
    familyName,
    middleName,
    givenName,
    fullName: trimmed,
  };
}

/**
 * Get initials from a Vietnamese name
 * For Vietnamese names, we typically use the initials of family and given name
 * Example: "Nguyen Van An" -> "NA"
 */
export function getInitials(fullName: string, maxLength: number = 2): string {
  const parsed = parseVietnameseName(fullName);

  if (!parsed.familyName) {
    return '';
  }

  const initials: string[] = [];

  // Always include family name initial
  if (parsed.familyName) {
    initials.push(parsed.familyName.charAt(0).toUpperCase());
  }

  // Include given name initial if available
  if (parsed.givenName && initials.length < maxLength) {
    initials.push(parsed.givenName.charAt(0).toUpperCase());
  }

  // Include middle name initial if we need more and it's available
  if (parsed.middleName && initials.length < maxLength) {
    initials.splice(1, 0, parsed.middleName.charAt(0).toUpperCase());
  }

  return initials.slice(0, maxLength).join('');
}

/**
 * Vietnamese diacritics mapping for normalization
 */
const VIETNAMESE_DIACRITICS: Record<string, string> = {
  'a': 'aàảãáạăằẳẵắặâầẩẫấậ',
  'A': 'AÀẢÃÁẠĂẰẲẴẮẶÂẦẨẪẤẬ',
  'd': 'dđ',
  'D': 'DĐ',
  'e': 'eèẻẽéẹêềểễếệ',
  'E': 'EÈẺẼÉẸÊỀỂỄẾỆ',
  'i': 'iìỉĩíị',
  'I': 'IÌỈĨÍỊ',
  'o': 'oòỏõóọôồổỗốộơờởỡớợ',
  'O': 'OÒỎÕÓỌÔỒỔỖỐỘƠỜỞỠỚỢ',
  'u': 'uùủũúụưừửữứự',
  'U': 'UÙỦŨÚỤƯỪỬỮỨỰ',
  'y': 'yỳỷỹýỵ',
  'Y': 'YỲỶỸÝỴ',
};

/**
 * Build reverse mapping for quick lookup
 */
function buildDiacriticsMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [base, chars] of Object.entries(VIETNAMESE_DIACRITICS)) {
    for (const char of chars) {
      map.set(char, base);
    }
  }
  return map;
}

const diacriticsMap = buildDiacriticsMap();

/**
 * Normalize Vietnamese name by removing diacritics
 * Useful for search and comparison
 * Example: "Nguyen Van An" -> "nguyen van an"
 */
export function normalizeVietnameseName(name: string): string {
  let normalized = '';
  for (const char of name) {
    const replacement = diacriticsMap.get(char);
    normalized += replacement ?? char;
  }
  return normalized.toLowerCase();
}
