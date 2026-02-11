import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { Colors } from '@/constants/Colors';
import { database, InsuranceCard, Patient } from '@/lib/database';
import { isOnline } from '@/lib/offline';
import { BHYTValidator } from '@/src/components/insurance/BHYTValidator';
import {
  syncInsuranceCards,
  pullInsuranceCards,
  type ConflictResolution,
  type SyncConflict,
} from '@/src/services/sync/insuranceSync';
import {
  SyncConflictModal,
  type ConflictField,
} from '@/src/components/SyncConflictModal';

interface InsuranceScreenProps {
  patientId: string;
  patientName: string;
  onNavigateToForm: (card?: InsuranceCard) => void;
}

export function InsuranceScreen({
  patientId,
  patientName,
  onNavigateToForm,
}: InsuranceScreenProps) {
  const [card, setCard] = useState<InsuranceCard | null>(null);
  const [resolvedPatientName, setResolvedPatientName] = useState(patientName);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [online, setOnline] = useState(true);
  const [coverageInput, setCoverageInput] = useState('');
  const [coverageResult, setCoverageResult] = useState<{
    insurancePays: number;
    copay: number;
  } | null>(null);

  // Conflict modal state
  const [conflictVisible, setConflictVisible] = useState(false);
  const [conflictFields, setConflictFields] = useState<ConflictField[]>([]);
  const [conflictResolver, setConflictResolver] = useState<
    ((resolution: ConflictResolution) => void) | null
  >(null);

  const loadInsuranceCard = useCallback(async () => {
    try {
      const cards = await database.collections
        .get<InsuranceCard>('insurance_cards')
        .query(Q.where('patient_id', patientId))
        .fetch();

      setCard(cards.length > 0 ? cards[0] : null);

      // Load patient name if not provided
      if (!patientName) {
        const patients = await database.collections
          .get<Patient>('patients')
          .query(Q.where('id', patientId))
          .fetch();
        if (patients.length > 0) {
          setResolvedPatientName(patients[0].fullName);
        }
      }
    } catch (error) {
      console.error('Failed to load insurance card:', error);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, patientName]);

  const checkOnlineStatus = useCallback(async () => {
    const status = await isOnline();
    setOnline(status);
  }, []);

  useEffect(() => {
    loadInsuranceCard();
    checkOnlineStatus();
  }, [loadInsuranceCard, checkOnlineStatus]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);

    const handleConflict = (conflict: SyncConflict): Promise<ConflictResolution> => {
      return new Promise((resolve) => {
        const fields: ConflictField[] = [
          {
            label: 'Card Number',
            localValue: conflict.localRecord.bhytCardNumber as string,
            serverValue: conflict.serverRecord.bhytCardNumber as string,
          },
          {
            label: 'Coverage %',
            localValue: String(conflict.localRecord.bhytCoveragePercent),
            serverValue: String(conflict.serverRecord.bhytCoveragePercent),
          },
          {
            label: 'Copay Rate',
            localValue: String(conflict.localRecord.bhytCopayRate),
            serverValue: String(conflict.serverRecord.bhytCopayRate),
          },
          {
            label: 'Valid From',
            localValue: conflict.localRecord.validFrom as string,
            serverValue: conflict.serverRecord.validFrom as string,
          },
          {
            label: 'Valid To',
            localValue: conflict.localRecord.validTo as string,
            serverValue: conflict.serverRecord.validTo as string,
          },
        ];

        setConflictFields(fields);
        setConflictResolver(() => resolve);
        setConflictVisible(true);
      });
    };

    try {
      // Pull first, then push
      await pullInsuranceCards(patientId);
      const result = await syncInsuranceCards(patientId, handleConflict);

      if (result.errors.length > 0) {
        Alert.alert('Sync Issues', result.errors.join('\n'));
      } else if (result.synced > 0 || result.conflicts > 0) {
        Alert.alert(
          'Sync Complete',
          `Synced: ${result.synced}, Conflicts resolved: ${result.conflicts}`
        );
      }

      await loadInsuranceCard();
    } catch (error) {
      Alert.alert(
        'Sync Failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsSyncing(false);
    }
  }, [patientId, loadInsuranceCard]);

  const handleConflictResolve = useCallback(
    (resolution: ConflictResolution) => {
      setConflictVisible(false);
      conflictResolver?.(resolution);
      setConflictResolver(null);
    },
    [conflictResolver]
  );

  const handleConflictCancel = useCallback(() => {
    setConflictVisible(false);
    // Default to server version on cancel
    conflictResolver?.('server');
    setConflictResolver(null);
  }, [conflictResolver]);

  const handleCalculateCoverage = useCallback(() => {
    if (!card || !coverageInput.trim()) return;

    const amount = parseFloat(coverageInput);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive number.');
      return;
    }

    const result = card.calculateCoverage(amount);
    setCoverageResult(result);
  }, [card, coverageInput]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  const validation = card?.validateCard();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Insurance</Text>
        <Text style={styles.headerSubtitle}>{resolvedPatientName}</Text>

        <View style={styles.headerActions}>
          {/* Online/Offline indicator */}
          <View
            style={[
              styles.statusBadge,
              online ? styles.statusOnline : styles.statusOffline,
            ]}
          >
            <Ionicons
              name={online ? 'cloud-done-outline' : 'cloud-offline-outline'}
              size={14}
              color={online ? Colors.light.success : Colors.light.warning}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: online ? Colors.light.success : Colors.light.warning,
                },
              ]}
            >
              {online ? 'Online' : 'Offline'}
            </Text>
          </View>

          {/* Sync button */}
          {card && !card.isSynced && (
            <View style={styles.unsyncedBadge}>
              <Ionicons
                name="sync-outline"
                size={14}
                color={Colors.light.warning}
              />
              <Text style={styles.unsyncedText}>Unsynced</Text>
            </View>
          )}
        </View>
      </View>

      {card ? (
        <>
          {/* Insurance card display */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>BHYT Card</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => onNavigateToForm(card)}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={Colors.light.tint}
                />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.insuranceCard}>
              {/* Card header */}
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardLabel}>Card Number</Text>
                  <Text style={styles.cardNumber}>{card.bhytCardNumber}</Text>
                </View>
                <View
                  style={[
                    styles.verifiedBadge,
                    card.isVerified
                      ? styles.verifiedActive
                      : styles.verifiedInactive,
                  ]}
                >
                  <Ionicons
                    name={card.isVerified ? 'shield-checkmark' : 'shield-outline'}
                    size={16}
                    color={
                      card.isVerified
                        ? Colors.light.success
                        : Colors.light.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.verifiedText,
                      {
                        color: card.isVerified
                          ? Colors.light.success
                          : Colors.light.textSecondary,
                      },
                    ]}
                  >
                    {card.isVerified ? 'Verified' : 'Unverified'}
                  </Text>
                </View>
              </View>

              {/* Card details */}
              <View style={styles.cardDetails}>
                <View style={styles.cardDetailRow}>
                  <Text style={styles.detailLabel}>Prefix Code</Text>
                  <Text style={styles.detailValue}>{card.bhytPrefixCode}</Text>
                </View>
                <View style={styles.cardDetailRow}>
                  <Text style={styles.detailLabel}>Coverage</Text>
                  <Text style={styles.detailValue}>
                    {card.bhytCoveragePercent}%
                  </Text>
                </View>
                <View style={styles.cardDetailRow}>
                  <Text style={styles.detailLabel}>Copay Rate</Text>
                  <Text style={styles.detailValue}>{card.bhytCopayRate}%</Text>
                </View>
                <View style={styles.cardDetailRow}>
                  <Text style={styles.detailLabel}>Valid From</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(card.validFrom)}
                  </Text>
                </View>
                <View style={styles.cardDetailRow}>
                  <Text style={styles.detailLabel}>Valid To</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(card.validTo)}
                  </Text>
                </View>
              </View>

              {/* Validation status */}
              {validation && !validation.isValid && (
                <View style={styles.validationWarning}>
                  <Ionicons
                    name="warning-outline"
                    size={16}
                    color={Colors.light.error}
                  />
                  <View style={styles.validationErrors}>
                    {validation.errors.map((error, index) => (
                      <Text key={index} style={styles.validationErrorText}>
                        {error}
                      </Text>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Coverage calculator */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coverage Calculator</Text>
            <View style={styles.card}>
              <Text style={styles.calculatorLabel}>Total Amount (VND)</Text>
              <View style={styles.calculatorInputRow}>
                <View style={styles.calculatorInputContainer}>
                  <TextInput
                    style={styles.calculatorInput}
                    value={coverageInput}
                    onChangeText={setCoverageInput}
                    placeholder="Enter amount..."
                    placeholderTextColor={Colors.light.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.calculateButton,
                    !coverageInput.trim() && styles.calculateButtonDisabled,
                  ]}
                  onPress={handleCalculateCoverage}
                  disabled={!coverageInput.trim()}
                >
                  <Text style={styles.calculateButtonText}>Calculate</Text>
                </TouchableOpacity>
              </View>

              {coverageResult && (
                <View style={styles.coverageResult}>
                  <View style={styles.coverageRow}>
                    <Text style={styles.coverageLabel}>Insurance Pays</Text>
                    <Text
                      style={[
                        styles.coverageValue,
                        { color: Colors.light.success },
                      ]}
                    >
                      {formatCurrency(coverageResult.insurancePays)}
                    </Text>
                  </View>
                  <View style={styles.coverageDivider} />
                  <View style={styles.coverageRow}>
                    <Text style={styles.coverageLabel}>Patient Copay</Text>
                    <Text
                      style={[
                        styles.coverageValue,
                        { color: Colors.light.error },
                      ]}
                    >
                      {formatCurrency(coverageResult.copay)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Card validator */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Validate Another Card</Text>
            <View style={styles.card}>
              <BHYTValidator />
            </View>
          </View>

          {/* Sync button */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
              onPress={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={Colors.light.background} />
              ) : (
                <Ionicons
                  name="sync-outline"
                  size={20}
                  color={Colors.light.background}
                />
              )}
              <Text style={styles.syncButtonText}>
                {isSyncing ? 'Syncing...' : 'Sync Insurance Data'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* No insurance card */
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="card-outline"
              size={48}
              color={Colors.light.textSecondary}
            />
          </View>
          <Text style={styles.emptyTitle}>No Insurance Card</Text>
          <Text style={styles.emptySubtitle}>
            Add a BHYT card to track insurance coverage and calculate copayments.
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => onNavigateToForm()}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={Colors.light.background}
            />
            <Text style={styles.addButtonText}>Add Insurance Card</Text>
          </TouchableOpacity>

          {/* Standalone validator for quick checks */}
          <View style={styles.validatorSection}>
            <Text style={styles.validatorSectionTitle}>Quick Card Check</Text>
            <BHYTValidator />
          </View>
        </View>
      )}

      {/* Conflict resolution modal */}
      <SyncConflictModal
        visible={conflictVisible}
        entityType="insurance_card"
        fields={conflictFields}
        onResolve={handleConflictResolve}
        onCancel={handleConflictCancel}
      />

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusOnline: {
    backgroundColor: Colors.light.success + '15',
  },
  statusOffline: {
    backgroundColor: Colors.light.warning + '15',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  unsyncedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.light.warning + '15',
  },
  unsyncedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.warning,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.tint,
  },
  insuranceCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedActive: {
    backgroundColor: Colors.light.success + '15',
  },
  verifiedInactive: {
    backgroundColor: Colors.light.backgroundSecondary,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    gap: 10,
  },
  cardDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  validationWarning: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.light.error + '10',
    borderRadius: 10,
  },
  validationErrors: {
    flex: 1,
    gap: 2,
  },
  validationErrorText: {
    fontSize: 13,
    color: Colors.light.error,
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  calculatorLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 8,
  },
  calculatorInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  calculatorInputContainer: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  calculatorInput: {
    fontSize: 15,
    color: Colors.light.text,
  },
  calculateButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calculateButtonDisabled: {
    opacity: 0.5,
  },
  calculateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.background,
  },
  coverageResult: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 10,
  },
  coverageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  coverageLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  coverageValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  coverageDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 4,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  validatorSection: {
    width: '100%',
    marginTop: 32,
    padding: 16,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  validatorSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  bottomPadding: {
    height: 40,
  },
});
