import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { database, OutcomeMeasure } from '@/lib/database';
import {
  MEASURE_TYPE_CONFIGS,
  type MeasureType,
  type MeasurePhase,
} from '@/lib/database/models/OutcomeMeasure';
import { queueForSync } from '@/lib/offline';

const MEASURE_TYPES = Object.entries(MEASURE_TYPE_CONFIGS) as [
  MeasureType,
  (typeof MEASURE_TYPE_CONFIGS)[MeasureType],
][];

const PHASES: { value: MeasurePhase; label: string }[] = [
  { value: 'baseline', label: 'Baseline' },
  { value: 'interim', label: 'Interim' },
  { value: 'discharge', label: 'Discharge' },
];

interface FormErrors {
  measureType?: string;
  score?: string;
  baselineScore?: string;
  targetScore?: string;
}

export default function MeasureFormScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const router = useRouter();

  const [measureType, setMeasureType] = useState<MeasureType | null>(null);
  const [score, setScore] = useState('');
  const [baselineScore, setBaselineScore] = useState('');
  const [targetScore, setTargetScore] = useState('');
  const [phase, setPhase] = useState<MeasurePhase>('baseline');
  const [notes, setNotes] = useState('');
  const [measurementDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const selectedConfig = measureType
    ? MEASURE_TYPE_CONFIGS[measureType]
    : null;

  const mcidThreshold = selectedConfig?.mcidDefault ?? 0;

  const formattedDate = useMemo(() => {
    return measurementDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [measurementDate]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!measureType) {
      newErrors.measureType = 'Please select a measure type';
    }

    const scoreNum = parseFloat(score);
    if (!score || isNaN(scoreNum)) {
      newErrors.score = 'Please enter a valid score';
    } else if (selectedConfig) {
      if (scoreNum < selectedConfig.minScore || scoreNum > selectedConfig.maxScore) {
        newErrors.score = `Score must be between ${selectedConfig.minScore} and ${selectedConfig.maxScore}`;
      }
    }

    const baselineNum = parseFloat(baselineScore);
    if (!baselineScore || isNaN(baselineNum)) {
      newErrors.baselineScore = 'Please enter a baseline score';
    } else if (selectedConfig) {
      if (baselineNum < selectedConfig.minScore || baselineNum > selectedConfig.maxScore) {
        newErrors.baselineScore = `Must be between ${selectedConfig.minScore} and ${selectedConfig.maxScore}`;
      }
    }

    const targetNum = parseFloat(targetScore);
    if (!targetScore || isNaN(targetNum)) {
      newErrors.targetScore = 'Please enter a target score';
    } else if (selectedConfig) {
      if (targetNum < selectedConfig.minScore || targetNum > selectedConfig.maxScore) {
        newErrors.targetScore = `Must be between ${selectedConfig.minScore} and ${selectedConfig.maxScore}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !measureType || !patientId) return;

    setIsSaving(true);

    try {
      const scoreNum = parseFloat(score);
      const baselineNum = parseFloat(baselineScore);
      const targetNum = parseFloat(targetScore);

      let newMeasureId = '';

      await database.write(async () => {
        const newMeasure = await database
          .get<OutcomeMeasure>('outcome_measures')
          .create((m) => {
            m.remoteId = '';
            m.patientId = patientId;
            m.measureType = measureType;
            m.baselineScore = baselineNum;
            m.currentScore = scoreNum;
            m.targetScore = targetNum;
            m.measurementDate = measurementDate;
            m.mcidThreshold = mcidThreshold;
            m.phase = phase;
            m.notes = notes || undefined;
            m.version = 1;
            m.isSynced = false;
            m.isDeleted = false;
            m.syncedAt = null;
          });
        newMeasureId = newMeasure.id;
      });

      // Queue for offline sync
      await queueForSync('outcome_measure', newMeasureId, 'create', {
        patientId,
        measureType,
        baselineScore: parseFloat(baselineScore),
        currentScore: scoreNum,
        targetScore: parseFloat(targetScore),
        measurementDate: measurementDate.toISOString(),
        mcidThreshold,
        phase,
        notes: notes || null,
        version: 1,
      });

      Alert.alert('Saved', 'Outcome measure recorded successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to save outcome measure:', error);
      Alert.alert('Error', 'Failed to save outcome measure. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectMeasureType = (type: MeasureType) => {
    setMeasureType(type);
    setShowTypePicker(false);
    // Pre-fill MCID and clear score errors
    setErrors((prev) => ({ ...prev, measureType: undefined, score: undefined }));
  };

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Date display */}
      <View style={styles.dateCard}>
        <Ionicons
          name="calendar-outline"
          size={20}
          color={Colors.light.tint}
        />
        <Text style={styles.dateText}>{formattedDate}</Text>
      </View>

      {/* Measure Type Selector */}
      <View style={styles.section}>
        <Text style={styles.label}>Measure Type</Text>
        <TouchableOpacity
          style={[
            styles.selector,
            errors.measureType ? styles.selectorError : null,
          ]}
          onPress={() => setShowTypePicker(!showTypePicker)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.selectorText,
              !measureType && styles.placeholderText,
            ]}
          >
            {selectedConfig
              ? `${selectedConfig.abbreviation} - ${selectedConfig.label}`
              : 'Select a measure type'}
          </Text>
          <Ionicons
            name={showTypePicker ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={Colors.light.textSecondary}
          />
        </TouchableOpacity>
        {errors.measureType && (
          <Text style={styles.errorText}>{errors.measureType}</Text>
        )}

        {showTypePicker && (
          <View style={styles.pickerList}>
            {MEASURE_TYPES.map(([type, config]) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.pickerItem,
                  measureType === type && styles.pickerItemSelected,
                ]}
                onPress={() => handleSelectMeasureType(type)}
                activeOpacity={0.7}
              >
                <View>
                  <Text
                    style={[
                      styles.pickerItemTitle,
                      measureType === type && styles.pickerItemTitleSelected,
                    ]}
                  >
                    {config.abbreviation}
                  </Text>
                  <Text style={styles.pickerItemSubtitle}>
                    {config.label}
                  </Text>
                </View>
                <Text style={styles.pickerItemRange}>
                  {config.minScore}-{config.maxScore} {config.unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Score input */}
      {selectedConfig && (
        <>
          <View style={styles.section}>
            <Text style={styles.label}>
              Current Score ({selectedConfig.minScore}-{selectedConfig.maxScore}{' '}
              {selectedConfig.unit})
            </Text>
            <TextInput
              style={[
                styles.input,
                errors.score ? styles.inputError : null,
              ]}
              value={score}
              onChangeText={(text) => {
                setScore(text);
                setErrors((prev) => ({ ...prev, score: undefined }));
              }}
              placeholder={`Enter score (${selectedConfig.minScore}-${selectedConfig.maxScore})`}
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="numeric"
              returnKeyType="next"
            />
            {errors.score && (
              <Text style={styles.errorText}>{errors.score}</Text>
            )}
            {selectedConfig.lowerIsBetter && (
              <Text style={styles.hintText}>
                Lower score = better outcome
              </Text>
            )}
            {!selectedConfig.lowerIsBetter && (
              <Text style={styles.hintText}>
                Higher score = better outcome
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Baseline Score</Text>
            <TextInput
              style={[
                styles.input,
                errors.baselineScore ? styles.inputError : null,
              ]}
              value={baselineScore}
              onChangeText={(text) => {
                setBaselineScore(text);
                setErrors((prev) => ({
                  ...prev,
                  baselineScore: undefined,
                }));
              }}
              placeholder={`Baseline (${selectedConfig.minScore}-${selectedConfig.maxScore})`}
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="numeric"
              returnKeyType="next"
            />
            {errors.baselineScore && (
              <Text style={styles.errorText}>{errors.baselineScore}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Target Score</Text>
            <TextInput
              style={[
                styles.input,
                errors.targetScore ? styles.inputError : null,
              ]}
              value={targetScore}
              onChangeText={(text) => {
                setTargetScore(text);
                setErrors((prev) => ({
                  ...prev,
                  targetScore: undefined,
                }));
              }}
              placeholder={`Target (${selectedConfig.minScore}-${selectedConfig.maxScore})`}
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="numeric"
              returnKeyType="next"
            />
            {errors.targetScore && (
              <Text style={styles.errorText}>{errors.targetScore}</Text>
            )}
          </View>

          {/* MCID display */}
          <View style={styles.section}>
            <View style={styles.mcidCard}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={Colors.light.tint}
              />
              <View style={styles.mcidInfo}>
                <Text style={styles.mcidLabel}>
                  MCID Threshold: {mcidThreshold} {selectedConfig.unit}
                </Text>
                <Text style={styles.mcidDescription}>
                  Minimal Clinically Important Difference for{' '}
                  {selectedConfig.abbreviation}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Phase selector */}
      <View style={styles.section}>
        <Text style={styles.label}>Assessment Phase</Text>
        <View style={styles.phaseSelector}>
          {PHASES.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[
                styles.phaseButton,
                phase === p.value && styles.phaseButtonSelected,
              ]}
              onPress={() => setPhase(p.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.phaseButtonText,
                  phase === p.value && styles.phaseButtonTextSelected,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes about this measurement..."
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Save button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            isSaving && styles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <Ionicons
            name="save-outline"
            size={22}
            color={Colors.light.background}
          />
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Measurement'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
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
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.background,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.light.text,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  selectorError: {
    borderColor: Colors.light.error,
  },
  selectorText: {
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
  },
  placeholderText: {
    color: Colors.light.textSecondary,
  },
  errorText: {
    fontSize: 12,
    color: Colors.light.error,
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  pickerList: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginTop: 8,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  pickerItemSelected: {
    backgroundColor: Colors.light.tint + '10',
  },
  pickerItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  pickerItemTitleSelected: {
    color: Colors.light.tint,
  },
  pickerItemSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  pickerItemRange: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  inputError: {
    borderColor: Colors.light.error,
  },
  mcidCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.light.tint + '10',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.tint + '30',
  },
  mcidInfo: {
    flex: 1,
  },
  mcidLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  mcidDescription: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  phaseSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  phaseButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  phaseButtonSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  phaseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  phaseButtonTextSelected: {
    color: Colors.light.background,
  },
  notesInput: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
    minHeight: 100,
    lineHeight: 22,
  },
  buttonContainer: {
    padding: 16,
    marginTop: 16,
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
  buttonDisabled: {
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
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  bottomPadding: {
    height: 40,
  },
});
