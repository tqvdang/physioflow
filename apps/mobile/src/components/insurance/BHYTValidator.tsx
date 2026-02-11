import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { api, ApiError } from '@/lib/api';
import { isOnline } from '@/lib/offline';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  source: 'local' | 'api';
  cardInfo?: {
    holderName?: string;
    coveragePercent?: number;
    validTo?: string;
  };
}

interface BHYTValidatorProps {
  initialValue?: string;
  onValidationComplete?: (result: ValidationResult) => void;
}

// BHYT card format: XX9-9999-99999-99999
const BHYT_CARD_REGEX = /^[A-Z]{2}\d-\d{4}-\d{5}-\d{5}$/;

function validateCardLocally(cardNumber: string): ValidationResult {
  const errors: string[] = [];

  if (!cardNumber.trim()) {
    errors.push('Card number is required');
    return { isValid: false, errors, source: 'local' };
  }

  if (!BHYT_CARD_REGEX.test(cardNumber)) {
    errors.push('Invalid format. Expected: XX9-9999-99999-99999');
  }

  // Validate prefix (first 2 characters are province code)
  const prefix = cardNumber.substring(0, 2);
  if (prefix && !/^[A-Z]{2}$/.test(prefix)) {
    errors.push('Invalid province prefix code');
  }

  return { isValid: errors.length === 0, errors, source: 'local' };
}

export function BHYTValidator({
  initialValue = '',
  onValidationComplete,
}: BHYTValidatorProps) {
  const [cardNumber, setCardNumber] = useState(initialValue);
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const handleValidate = useCallback(async () => {
    if (!cardNumber.trim()) return;

    setIsValidating(true);
    setResult(null);

    // Always run local validation first
    const localResult = validateCardLocally(cardNumber);
    if (!localResult.isValid) {
      setResult(localResult);
      setIsValidating(false);
      onValidationComplete?.(localResult);
      return;
    }

    // Try API validation if online
    const online = await isOnline();
    setIsOffline(!online);

    if (online) {
      try {
        const apiResult = await api.post<{
          valid: boolean;
          holderName?: string;
          coveragePercent?: number;
          validTo?: string;
          errors?: string[];
        }>('/insurance/validate', { cardNumber });

        const validationResult: ValidationResult = {
          isValid: apiResult.valid,
          errors: apiResult.errors || [],
          source: 'api',
          cardInfo: apiResult.valid
            ? {
                holderName: apiResult.holderName,
                coveragePercent: apiResult.coveragePercent,
                validTo: apiResult.validTo,
              }
            : undefined,
        };

        setResult(validationResult);
        onValidationComplete?.(validationResult);
      } catch (error) {
        // API validation failed, fall back to local result
        const fallbackResult: ValidationResult = {
          ...localResult,
          source: 'local',
        };
        setResult(fallbackResult);
        onValidationComplete?.(fallbackResult);
      }
    } else {
      // Offline: use local validation only
      setResult(localResult);
      onValidationComplete?.(localResult);
    }

    setIsValidating(false);
  }, [cardNumber, onValidationComplete]);

  const formatInput = (text: string) => {
    // Auto-format: strip non-alphanumeric, add dashes
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let formatted = '';

    for (let i = 0; i < cleaned.length && i < 17; i++) {
      if (i === 3 || i === 7 || i === 12) {
        formatted += '-';
      }
      formatted += cleaned[i];
    }

    setCardNumber(formatted);
    // Clear previous result when input changes
    if (result) setResult(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>BHYT Card Number</Text>

      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <Ionicons
            name="card-outline"
            size={20}
            color={Colors.light.textSecondary}
          />
          <TextInput
            style={styles.input}
            value={cardNumber}
            onChangeText={formatInput}
            placeholder="XX9-9999-99999-99999"
            placeholderTextColor={Colors.light.textSecondary}
            autoCapitalize="characters"
            maxLength={21}
          />
          {cardNumber.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setCardNumber('');
                setResult(null);
              }}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={Colors.light.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.validateButton,
            (!cardNumber.trim() || isValidating) && styles.validateButtonDisabled,
          ]}
          onPress={handleValidate}
          disabled={!cardNumber.trim() || isValidating}
        >
          {isValidating ? (
            <ActivityIndicator size="small" color={Colors.light.background} />
          ) : (
            <Text style={styles.validateButtonText}>Validate</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Offline indicator */}
      {isOffline && (
        <View style={styles.offlineBadge}>
          <Ionicons
            name="cloud-offline-outline"
            size={14}
            color={Colors.light.warning}
          />
          <Text style={styles.offlineText}>
            Offline - local validation only
          </Text>
        </View>
      )}

      {/* Validation result */}
      {result && (
        <View
          style={[
            styles.resultContainer,
            result.isValid ? styles.resultSuccess : styles.resultError,
          ]}
        >
          <View style={styles.resultHeader}>
            <Ionicons
              name={result.isValid ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={result.isValid ? Colors.light.success : Colors.light.error}
            />
            <Text
              style={[
                styles.resultTitle,
                {
                  color: result.isValid
                    ? Colors.light.success
                    : Colors.light.error,
                },
              ]}
            >
              {result.isValid ? 'Valid Card' : 'Invalid Card'}
            </Text>
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceText}>
                {result.source === 'api' ? 'API Verified' : 'Local Check'}
              </Text>
            </View>
          </View>

          {result.errors.length > 0 && (
            <View style={styles.errorList}>
              {result.errors.map((error, index) => (
                <View key={index} style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={14}
                    color={Colors.light.error}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ))}
            </View>
          )}

          {result.cardInfo && (
            <View style={styles.cardInfoContainer}>
              {result.cardInfo.holderName && (
                <View style={styles.cardInfoRow}>
                  <Text style={styles.cardInfoLabel}>Holder</Text>
                  <Text style={styles.cardInfoValue}>
                    {result.cardInfo.holderName}
                  </Text>
                </View>
              )}
              {result.cardInfo.coveragePercent != null && (
                <View style={styles.cardInfoRow}>
                  <Text style={styles.cardInfoLabel}>Coverage</Text>
                  <Text style={styles.cardInfoValue}>
                    {result.cardInfo.coveragePercent}%
                  </Text>
                </View>
              )}
              {result.cardInfo.validTo && (
                <View style={styles.cardInfoRow}>
                  <Text style={styles.cardInfoLabel}>Valid Until</Text>
                  <Text style={styles.cardInfoValue}>
                    {new Date(result.cardInfo.validTo).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
    letterSpacing: 0.5,
  },
  validateButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validateButtonDisabled: {
    opacity: 0.5,
  },
  validateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.background,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  offlineText: {
    fontSize: 12,
    color: Colors.light.warning,
    fontWeight: '500',
  },
  resultContainer: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: Colors.light.success + '10',
    borderColor: Colors.light.success + '30',
  },
  resultError: {
    backgroundColor: Colors.light.error + '10',
    borderColor: Colors.light.error + '30',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  sourceBadge: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  errorList: {
    marginTop: 8,
    gap: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: Colors.light.error,
    flex: 1,
  },
  cardInfoContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.light.success + '30',
    gap: 6,
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardInfoLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  cardInfoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.text,
  },
});
