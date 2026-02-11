import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { database, OutcomeMeasure } from '@/lib/database';
import {
  MEASURE_TYPE_CONFIGS,
  type MeasurePhase,
} from '@/lib/database/models/OutcomeMeasure';
import { queueForSync } from '@/lib/offline';

const PHASES: { value: MeasurePhase; label: string }[] = [
  { value: 'baseline', label: 'Baseline' },
  { value: 'interim', label: 'Interim' },
  { value: 'discharge', label: 'Discharge' },
];

interface FormErrors {
  score?: string;
  baselineScore?: string;
  targetScore?: string;
}

export default function OutcomeMeasureEditScreen() {
  const { measureId } = useLocalSearchParams<{ measureId: string }>();
  const router = useRouter();

  const [measure, setMeasure] = useState<OutcomeMeasure | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState('');
  const [baselineScore, setBaselineScore] = useState('');
  const [targetScore, setTargetScore] = useState('');
  const [phase, setPhase] = useState<MeasurePhase>('interim');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!measureId) return;

    const loadMeasure = async () => {
      try {
        const record = await database
          .get<OutcomeMeasure>('outcome_measures')
          .find(measureId);
        setMeasure(record);
        setScore(record.currentScore.toString());
        setBaselineScore(record.baselineScore.toString());
        setTargetScore(record.targetScore.toString());
        setPhase(record.phase);
        setNotes(record.notes || '');
      } catch (error) {
        console.error('Failed to load outcome measure:', error);
        Alert.alert('Error', 'Failed to load outcome measure', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadMeasure();
  }, [measureId, router]);

  const selectedConfig = measure
    ? MEASURE_TYPE_CONFIGS[measure.measureType]
    : null;

  const formattedDate = useMemo(() => {
    if (!measure) return '';
    return measure.measurementDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [measure]);

  const validateForm = (): boolean => {
    if (!selectedConfig) return false;
    const newErrors: FormErrors = {};

    const scoreNum = parseFloat(score);
    if (!score || isNaN(scoreNum)) {
      newErrors.score = 'Please enter a valid score';
    } else if (
      scoreNum < selectedConfig.minScore ||
      scoreNum > selectedConfig.maxScore
    ) {
      newErrors.score = `Score must be between ${selectedConfig.minScore} and ${selectedConfig.maxScore}`;
    }

    const baselineNum = parseFloat(baselineScore);
    if (!baselineScore || isNaN(baselineNum)) {
      newErrors.baselineScore = 'Please enter a baseline score';
    } else if (
      baselineNum < selectedConfig.minScore ||
      baselineNum > selectedConfig.maxScore
    ) {
      newErrors.baselineScore = `Must be between ${selectedConfig.minScore} and ${selectedConfig.maxScore}`;
    }

    const targetNum = parseFloat(targetScore);
    if (!targetScore || isNaN(targetNum)) {
      newErrors.targetScore = 'Please enter a target score';
    } else if (
      targetNum < selectedConfig.minScore ||
      targetNum > selectedConfig.maxScore
    ) {
      newErrors.targetScore = `Must be between ${selectedConfig.minScore} and ${selectedConfig.maxScore}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !measure) return;

    setIsSaving(true);

    try {
      await measure.updateMeasure({
        currentScore: parseFloat(score),
        baselineScore: parseFloat(baselineScore),
        targetScore: parseFloat(targetScore),
        phase,
        notes: notes || undefined,
      });

      // Queue update for sync
      await queueForSync('outcome_measure', measure.id, 'update', {
        patientId: measure.patientId,
        remoteId: measure.remoteId,
        currentScore: parseFloat(score),
        baselineScore: parseFloat(baselineScore),
        targetScore: parseFloat(targetScore),
        phase,
        notes: notes || null,
        measuredAt: measure.measurementDate.toISOString(),
        version: measure.version,
      });

      Alert.alert('Updated', 'Outcome measure updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to update outcome measure:', error);
      Alert.alert(
        'Error',
        'Failed to update outcome measure. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Loading measure...</Text>
      </View>
    );
  }

  if (!measure || !selectedConfig) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={Colors.light.error}
        />
        <Text style={styles.loadingText}>Measure not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Measure type display (read-only) */}
      <View style={styles.typeCard}>
        <View style={styles.typeInfo}>
          <Text style={styles.typeAbbreviation}>
            {selectedConfig.abbreviation}
          </Text>
          <Text style={styles.typeLabel}>{selectedConfig.label}</Text>
        </View>
        <Text style={styles.typeRange}>
          {selectedConfig.minScore}-{selectedConfig.maxScore}{' '}
          {selectedConfig.unit}
        </Text>
      </View>

      {/* Date display (read-only) */}
      <View style={styles.dateCard}>
        <Ionicons
          name="calendar-outline"
          size={20}
          color={Colors.light.tint}
        />
        <Text style={styles.dateText}>{formattedDate}</Text>
      </View>

      {/* Current score input */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Current Score ({selectedConfig.minScore}-{selectedConfig.maxScore}{' '}
          {selectedConfig.unit})
        </Text>
        <TextInput
          style={[styles.input, errors.score ? styles.inputError : null]}
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
        <Text style={styles.hintText}>
          {selectedConfig.lowerIsBetter
            ? 'Lower score = better outcome'
            : 'Higher score = better outcome'}
        </Text>
      </View>

      {/* Baseline score */}
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
            setErrors((prev) => ({ ...prev, baselineScore: undefined }));
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

      {/* Target score */}
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
            setErrors((prev) => ({ ...prev, targetScore: undefined }));
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

      {/* MCID info */}
      <View style={styles.section}>
        <View style={styles.mcidCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={Colors.light.tint}
          />
          <View style={styles.mcidInfo}>
            <Text style={styles.mcidLabel}>
              MCID Threshold: {measure.mcidThreshold} {selectedConfig.unit}
            </Text>
            <Text style={styles.mcidDescription}>
              Minimal Clinically Important Difference for{' '}
              {selectedConfig.abbreviation}
            </Text>
          </View>
        </View>
      </View>

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

      {/* Save / Cancel buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={22}
            color={Colors.light.background}
          />
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Update Measurement'}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 12,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.tint + '10',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.tint + '30',
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeAbbreviation: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.tint,
  },
  typeLabel: {
    fontSize: 14,
    color: Colors.light.text,
  },
  typeRange: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '500',
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
