import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { database, InsuranceCard } from '@/lib/database';
import { queueForSync } from '@/lib/offline';

// BHYT beneficiary prefix codes (2-letter codes indicating insurance category)
const PREFIX_CODES = [
  { label: 'DN - Doanh nghiep (Enterprise)', value: 'DN', coverage: 80 },
  { label: 'HC - Hanh chinh (Civil servants)', value: 'HC', coverage: 80 },
  { label: 'HT - Huu tri (Retirees)', value: 'HT', coverage: 95 },
  { label: 'TE - Tre em (Children under 6)', value: 'TE', coverage: 100 },
  { label: 'HS - Hoc sinh (Students)', value: 'HS', coverage: 80 },
  { label: 'HN - Ho ngheo (Poor households)', value: 'HN', coverage: 100 },
  { label: 'CN - Can ngheo (Near-poor)', value: 'CN', coverage: 95 },
  { label: 'TN - Tu nguyen (Voluntary)', value: 'TN', coverage: 70 },
  { label: 'CC - Chinh sach (Policy)', value: 'CC', coverage: 100 },
  { label: 'QN - Quan nhan (Military)', value: 'QN', coverage: 100 },
  { label: 'CA - Cuu chien binh (Veterans)', value: 'CA', coverage: 95 },
  { label: 'NN - Nguoi nuoc ngoai (Foreign)', value: 'NN', coverage: 80 },
  { label: 'GD - Gia dinh liet si (Martyrs)', value: 'GD', coverage: 100 },
  { label: 'NO - Nguoi cao tuoi 80+ (Elderly)', value: 'NO', coverage: 100 },
  { label: 'CB - Thuong binh (War veterans)', value: 'CB', coverage: 100 },
  { label: 'XK - Ho ngheo/can ngheo', value: 'XK', coverage: 100 },
  { label: 'TX - Bao hiem xa hoi (Social ins)', value: 'TX', coverage: 80 },
];

// Common BHYT coverage tiers
const COVERAGE_OPTIONS = [
  { label: '100%', value: 100 },
  { label: '95%', value: 95 },
  { label: '80%', value: 80 },
  { label: '40%', value: 40 },
];

const BHYT_CARD_REGEX = /^[A-Z]{2}\d-\d{4}-\d{5}-\d{5}$/;

interface InsuranceFormScreenProps {
  patientId: string;
  existingCard?: InsuranceCard;
  onSave: () => void;
  onCancel: () => void;
}

interface FormErrors {
  cardNumber?: string;
  prefixCode?: string;
  hospitalRegCode?: string;
  coveragePercent?: string;
  copayRate?: string;
  validFrom?: string;
  validTo?: string;
}

export function InsuranceFormScreen({
  patientId,
  existingCard,
  onSave,
  onCancel,
}: InsuranceFormScreenProps) {
  const isEditing = !!existingCard;

  // Form state
  const [cardNumber, setCardNumber] = useState(
    existingCard?.bhytCardNumber || ''
  );
  const [prefixCode, setPrefixCode] = useState(
    existingCard?.bhytPrefixCode || ''
  );
  const [coveragePercent, setCoveragePercent] = useState(
    existingCard?.bhytCoveragePercent?.toString() || '80'
  );
  const [copayRate, setCopayRate] = useState(
    existingCard?.bhytCopayRate?.toString() || '20'
  );
  const [validFrom, setValidFrom] = useState(
    existingCard?.validFrom
      ? formatDateForInput(existingCard.validFrom)
      : formatDateForInput(new Date())
  );
  const [validTo, setValidTo] = useState(
    existingCard?.validTo
      ? formatDateForInput(existingCard.validTo)
      : formatDateForInput(
          new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        )
  );
  const [hospitalRegCode, setHospitalRegCode] = useState(
    existingCard?.hospitalRegistrationCode || ''
  );
  const [expirationDate, setExpirationDate] = useState(
    existingCard?.expirationDate
      ? formatDateForInput(existingCard.expirationDate)
      : ''
  );

  const [showPrefixPicker, setShowPrefixPicker] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [cardNumberValid, setCardNumberValid] = useState<boolean | null>(null);

  function formatDateForInput(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function parseDateFromInput(dateStr: string): Date | null {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

    const date = new Date(year, month, day);
    if (
      date.getDate() !== day ||
      date.getMonth() !== month ||
      date.getFullYear() !== year
    ) {
      return null;
    }

    return date;
  }

  const formatCardNumberInput = useCallback(
    (text: string) => {
      const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
      let formatted = '';

      for (let i = 0; i < cleaned.length && i < 17; i++) {
        if (i === 3 || i === 7 || i === 12) {
          formatted += '-';
        }
        formatted += cleaned[i];
      }

      setCardNumber(formatted);

      // Real-time validation
      if (formatted.length >= 21) {
        setCardNumberValid(BHYT_CARD_REGEX.test(formatted));
      } else {
        setCardNumberValid(null);
      }
    },
    []
  );

  const formatDateInput = useCallback(
    (text: string, setter: (value: string) => void) => {
      const cleaned = text.replace(/[^0-9]/g, '');
      let formatted = '';

      for (let i = 0; i < cleaned.length && i < 8; i++) {
        if (i === 2 || i === 4) {
          formatted += '/';
        }
        formatted += cleaned[i];
      }

      setter(formatted);
    },
    []
  );

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!cardNumber.trim()) {
      newErrors.cardNumber = 'Card number is required';
    } else if (!BHYT_CARD_REGEX.test(cardNumber)) {
      newErrors.cardNumber = 'Invalid format (XX9-9999-99999-99999)';
    }

    if (!prefixCode.trim()) {
      newErrors.prefixCode = 'Prefix code is required';
    }

    if (hospitalRegCode.trim() && hospitalRegCode.trim().length !== 5) {
      newErrors.hospitalRegCode = 'Must be exactly 5 characters';
    }

    const coverage = parseFloat(coveragePercent);
    if (isNaN(coverage) || coverage < 0 || coverage > 100) {
      newErrors.coveragePercent = 'Must be between 0 and 100';
    }

    const copay = parseFloat(copayRate);
    if (isNaN(copay) || copay < 0 || copay > 100) {
      newErrors.copayRate = 'Must be between 0 and 100';
    }

    const fromDate = parseDateFromInput(validFrom);
    if (!fromDate) {
      newErrors.validFrom = 'Invalid date (DD/MM/YYYY)';
    }

    const toDate = parseDateFromInput(validTo);
    if (!toDate) {
      newErrors.validTo = 'Invalid date (DD/MM/YYYY)';
    }

    if (fromDate && toDate && fromDate >= toDate) {
      newErrors.validTo = 'Must be after Valid From date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [cardNumber, prefixCode, hospitalRegCode, coveragePercent, copayRate, validFrom, validTo]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    setIsSaving(true);

    const fromDate = parseDateFromInput(validFrom)!;
    const toDate = parseDateFromInput(validTo)!;
    const coverage = parseFloat(coveragePercent);
    const copay = parseFloat(copayRate);

    try {
      if (isEditing && existingCard) {
        // Update existing card
        await database.write(async () => {
          await existingCard.update((card) => {
            card.bhytCardNumber = cardNumber;
            card.bhytPrefixCode = prefixCode;
            card.bhytCoveragePercent = coverage;
            card.bhytCopayRate = copay;
            card.validFrom = fromDate;
            card.validTo = toDate;
            card.isSynced = false;
            card.version = existingCard.version + 1;
          });
        });

        await queueForSync('insurance_card', existingCard.id, 'update', {
          bhytCardNumber: cardNumber,
          bhytPrefixCode: prefixCode,
          bhytCoveragePercent: coverage,
          bhytCopayRate: copay,
          validFrom: fromDate.toISOString(),
          validTo: toDate.toISOString(),
          version: existingCard.version + 1,
        });
      } else {
        // Create new card
        let newCardId = '';
        await database.write(async () => {
          const newCard = await database
            .get<InsuranceCard>('insurance_cards')
            .create((card) => {
              card.remoteId = '';
              card.patientId = patientId;
              card.bhytCardNumber = cardNumber;
              card.bhytPrefixCode = prefixCode;
              card.bhytCoveragePercent = coverage;
              card.bhytCopayRate = copay;
              card.validFrom = fromDate;
              card.validTo = toDate;
              card.isVerified = false;
              card.version = 1;
              card.isSynced = false;
            });
          newCardId = newCard.id;
        });

        await queueForSync('insurance_card', newCardId, 'create', {
          patientId,
          bhytCardNumber: cardNumber,
          bhytPrefixCode: prefixCode,
          bhytCoveragePercent: coverage,
          bhytCopayRate: copay,
          validFrom: fromDate.toISOString(),
          validTo: toDate.toISOString(),
        });
      }

      Alert.alert(
        'Saved',
        isEditing
          ? 'Insurance card updated. Will sync when online.'
          : 'Insurance card added. Will sync when online.',
        [{ text: 'OK', onPress: onSave }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to save insurance card. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    validate,
    isEditing,
    existingCard,
    cardNumber,
    prefixCode,
    coveragePercent,
    copayRate,
    validFrom,
    validTo,
    patientId,
    onSave,
  ]);

  const handleCoverageSelect = useCallback(
    (value: number) => {
      setCoveragePercent(value.toString());
      setCopayRate((100 - value).toString());
    },
    []
  );

  const selectedPrefixLabel = useMemo(() => {
    const found = PREFIX_CODES.find((p) => p.value === prefixCode);
    return found ? found.label : prefixCode || 'Select prefix code...';
  }, [prefixCode]);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onCancel} style={styles.backButton}>
            <Ionicons name="close" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Insurance Card' : 'Add Insurance Card'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      {/* Form */}
      <View style={styles.formContainer}>
        {/* Card Number */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            BHYT Card Number <Text style={styles.required}>*</Text>
          </Text>
          <View
            style={[
              styles.inputContainer,
              errors.cardNumber && styles.inputError,
              cardNumberValid === true && styles.inputSuccess,
            ]}
          >
            <Ionicons
              name="card-outline"
              size={20}
              color={Colors.light.textSecondary}
            />
            <TextInput
              style={styles.input}
              value={cardNumber}
              onChangeText={formatCardNumberInput}
              placeholder="XX9-9999-99999-99999"
              placeholderTextColor={Colors.light.textSecondary}
              autoCapitalize="characters"
              maxLength={21}
            />
            {cardNumberValid === true && (
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.light.success}
              />
            )}
            {cardNumberValid === false && (
              <Ionicons
                name="close-circle"
                size={20}
                color={Colors.light.error}
              />
            )}
          </View>
          {errors.cardNumber && (
            <Text style={styles.errorText}>{errors.cardNumber}</Text>
          )}
          <Text style={styles.helperText}>
            Format: 2 letters + digit, then groups of 4, 5, 5 digits
          </Text>
        </View>

        {/* Prefix Code Picker */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            Province Prefix Code <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.pickerButton,
              errors.prefixCode && styles.inputError,
            ]}
            onPress={() => setShowPrefixPicker(!showPrefixPicker)}
          >
            <Text
              style={[
                styles.pickerButtonText,
                !prefixCode && styles.pickerPlaceholder,
              ]}
            >
              {selectedPrefixLabel}
            </Text>
            <Ionicons
              name={showPrefixPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.light.textSecondary}
            />
          </TouchableOpacity>
          {errors.prefixCode && (
            <Text style={styles.errorText}>{errors.prefixCode}</Text>
          )}

          {showPrefixPicker && (
            <View style={styles.pickerList}>
              {PREFIX_CODES.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.pickerOption,
                    prefixCode === option.value && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    setPrefixCode(option.value);
                    setShowPrefixPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      prefixCode === option.value &&
                        styles.pickerOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {prefixCode === option.value && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={Colors.light.tint}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Hospital Registration Code */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            Hospital Registration Code (Ma KCB BD)
          </Text>
          <View
            style={[
              styles.inputContainer,
              errors.hospitalRegCode && styles.inputError,
            ]}
          >
            <Ionicons
              name="business-outline"
              size={20}
              color={Colors.light.textSecondary}
            />
            <TextInput
              style={styles.input}
              value={hospitalRegCode}
              onChangeText={(text) => setHospitalRegCode(text.trim())}
              placeholder="79024"
              placeholderTextColor={Colors.light.textSecondary}
              maxLength={5}
            />
          </View>
          {errors.hospitalRegCode && (
            <Text style={styles.errorText}>{errors.hospitalRegCode}</Text>
          )}
          <Text style={styles.helperText}>
            5-character facility code for claim eligibility
          </Text>
        </View>

        {/* Expiration Date */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            Expiration Date
          </Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={Colors.light.textSecondary}
            />
            <TextInput
              style={styles.input}
              value={expirationDate}
              onChangeText={(text) => formatDateInput(text, setExpirationDate)}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
          <Text style={styles.helperText}>
            Card expiration date for visit-date validation
          </Text>
        </View>

        {/* Coverage Percent */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            Coverage Percentage <Text style={styles.required}>*</Text>
          </Text>

          {/* Quick-select buttons */}
          <View style={styles.quickSelectRow}>
            {COVERAGE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.quickSelectButton,
                  coveragePercent === option.value.toString() &&
                    styles.quickSelectButtonActive,
                ]}
                onPress={() => handleCoverageSelect(option.value)}
              >
                <Text
                  style={[
                    styles.quickSelectText,
                    coveragePercent === option.value.toString() &&
                      styles.quickSelectTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.percentRow}>
            <View
              style={[
                styles.percentInputContainer,
                errors.coveragePercent && styles.inputError,
              ]}
            >
              <TextInput
                style={styles.percentInput}
                value={coveragePercent}
                onChangeText={(text) => {
                  setCoveragePercent(text);
                  const val = parseFloat(text);
                  if (!isNaN(val) && val >= 0 && val <= 100) {
                    setCopayRate((100 - val).toString());
                  }
                }}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.percentSign}>%</Text>
            </View>
          </View>
          {errors.coveragePercent && (
            <Text style={styles.errorText}>{errors.coveragePercent}</Text>
          )}
        </View>

        {/* Copay Rate */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            Copay Rate <Text style={styles.required}>*</Text>
          </Text>
          <View
            style={[
              styles.percentInputContainer,
              errors.copayRate && styles.inputError,
            ]}
          >
            <TextInput
              style={styles.percentInput}
              value={copayRate}
              onChangeText={(text) => {
                setCopayRate(text);
                const val = parseFloat(text);
                if (!isNaN(val) && val >= 0 && val <= 100) {
                  setCoveragePercent((100 - val).toString());
                }
              }}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.percentSign}>%</Text>
          </View>
          {errors.copayRate && (
            <Text style={styles.errorText}>{errors.copayRate}</Text>
          )}
        </View>

        {/* Valid From */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            Valid From <Text style={styles.required}>*</Text>
          </Text>
          <View
            style={[
              styles.inputContainer,
              errors.validFrom && styles.inputError,
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color={Colors.light.textSecondary}
            />
            <TextInput
              style={styles.input}
              value={validFrom}
              onChangeText={(text) => formatDateInput(text, setValidFrom)}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
          {errors.validFrom && (
            <Text style={styles.errorText}>{errors.validFrom}</Text>
          )}
        </View>

        {/* Valid To */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            Valid To <Text style={styles.required}>*</Text>
          </Text>
          <View
            style={[
              styles.inputContainer,
              errors.validTo && styles.inputError,
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color={Colors.light.textSecondary}
            />
            <TextInput
              style={styles.input}
              value={validTo}
              onChangeText={(text) => formatDateInput(text, setValidTo)}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
          {errors.validTo && (
            <Text style={styles.errorText}>{errors.validTo}</Text>
          )}
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Ionicons
            name={isEditing ? 'save-outline' : 'add-circle-outline'}
            size={20}
            color={Colors.light.background}
          />
          <Text style={styles.saveButtonText}>
            {isSaving
              ? 'Saving...'
              : isEditing
              ? 'Save Changes'
              : 'Add Card'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  headerSpacer: {
    width: 40,
  },
  formContainer: {
    padding: 16,
    gap: 20,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  required: {
    color: Colors.light.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  inputError: {
    borderColor: Colors.light.error,
  },
  inputSuccess: {
    borderColor: Colors.light.success,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
  },
  errorText: {
    fontSize: 12,
    color: Colors.light.error,
    marginTop: 2,
  },
  helperText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  pickerButtonText: {
    fontSize: 15,
    color: Colors.light.text,
  },
  pickerPlaceholder: {
    color: Colors.light.textSecondary,
  },
  pickerList: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    maxHeight: 240,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  pickerOptionSelected: {
    backgroundColor: Colors.light.tint + '10',
  },
  pickerOptionText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  pickerOptionTextSelected: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  quickSelectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickSelectButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  quickSelectButtonActive: {
    backgroundColor: Colors.light.tint + '15',
    borderColor: Colors.light.tint,
  },
  quickSelectText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  quickSelectTextActive: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  percentRow: {
    flexDirection: 'row',
  },
  percentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.light.border,
    width: 100,
  },
  percentInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
  },
  percentSign: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelButtonText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 40,
  },
});
