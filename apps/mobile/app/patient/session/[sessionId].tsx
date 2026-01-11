import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { PainSlider, ChecklistItem } from '@/components';
import { queueForSync } from '@/lib/offline';

// Mock session data
const MOCK_SESSION = {
  id: 's1',
  patientName: 'John Smith',
  scheduledAt: '2024-01-10T09:00:00',
  duration: 45,
  type: 'Follow-up',
  status: 'in_progress' as const,
  painBefore: 6,
  painAfter: null as number | null,
  notes: '',
  checklist: [
    { id: 'c1', title: 'Warm-up stretches', description: '5-10 minutes light stretching', isCompleted: true },
    { id: 'c2', title: 'Manual therapy', description: 'Lumbar spine mobilization', isCompleted: true },
    { id: 'c3', title: 'Therapeutic exercises', description: 'Core strengthening routine', isCompleted: false },
    { id: 'c4', title: 'Patient education', description: 'Home exercise review', isCompleted: false },
    { id: 'c5', title: 'Cool-down', description: 'Ice pack application', isCompleted: false },
  ],
};

export default function SessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();

  const [session, setSession] = useState(MOCK_SESSION);
  const [painAfter, setPainAfter] = useState(session.painAfter ?? 0);
  const [notes, setNotes] = useState(session.notes);
  const [isSaving, setIsSaving] = useState(false);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleToggleChecklist = (id: string) => {
    setSession((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item) =>
        item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
      ),
    }));
  };

  const handleCompleteSession = async () => {
    const incompleteItems = session.checklist.filter((item) => !item.isCompleted);

    if (incompleteItems.length > 0) {
      Alert.alert(
        'Incomplete Checklist',
        `You have ${incompleteItems.length} incomplete items. Complete session anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete', onPress: saveSession },
        ]
      );
    } else {
      saveSession();
    }
  };

  const saveSession = async () => {
    setIsSaving(true);

    try {
      // Queue for offline sync
      await queueForSync('session', session.id, 'update', {
        ...session,
        painAfter,
        notes,
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Session completed and saved', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save session. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const completedCount = session.checklist.filter((item) => item.isCompleted).length;
  const totalCount = session.checklist.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <ScrollView style={styles.container}>
      {/* Session header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.patientName}>{session.patientName}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>In Progress</Text>
          </View>
        </View>
        <Text style={styles.sessionMeta}>
          {formatDate(session.scheduledAt)} at {formatTime(session.scheduledAt)}
        </Text>
        <Text style={styles.sessionType}>
          {session.type} - {session.duration} minutes
        </Text>
      </View>

      {/* Pain assessment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pain Assessment</Text>
        <View style={styles.card}>
          <View style={styles.painRow}>
            <View style={styles.painBefore}>
              <Text style={styles.painLabel}>Before Session</Text>
              <Text style={[styles.painValueLarge, { color: Colors.light.error }]}>
                {session.painBefore}
              </Text>
            </View>
            <Ionicons
              name="arrow-forward"
              size={24}
              color={Colors.light.textSecondary}
            />
            <View style={styles.painAfter}>
              <Text style={styles.painLabel}>After Session</Text>
              <Text style={[styles.painValueLarge, { color: Colors.light.success }]}>
                {painAfter}
              </Text>
            </View>
          </View>
          <PainSlider
            value={painAfter}
            onChange={setPainAfter}
            label="Record pain after session"
          />
        </View>
      </View>

      {/* Checklist */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Session Checklist</Text>
          <Text style={styles.progressText}>
            {completedCount}/{totalCount} completed
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.checklistContainer}>
          {session.checklist.map((item) => (
            <ChecklistItem
              key={item.id}
              id={item.id}
              title={item.title}
              description={item.description}
              isCompleted={item.isCompleted}
              onToggle={handleToggleChecklist}
            />
          ))}
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session Notes</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes about this session..."
            placeholderTextColor={Colors.light.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Complete button */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.completeButton, isSaving && styles.buttonDisabled]}
          onPress={handleCompleteSession}
          disabled={isSaving}
        >
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={Colors.light.background}
          />
          <Text style={styles.completeButtonText}>
            {isSaving ? 'Saving...' : 'Complete Session'}
          </Text>
        </Pressable>
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
    padding: 20,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  statusBadge: {
    backgroundColor: Colors.light.warning + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.warning,
  },
  sessionMeta: {
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
  sessionType: {
    fontSize: 14,
    color: Colors.light.tint,
    marginTop: 4,
    fontWeight: '500',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  painRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  painBefore: {
    alignItems: 'center',
  },
  painAfter: {
    alignItems: 'center',
  },
  painLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  painValueLarge: {
    fontSize: 36,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.light.border,
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.tint,
    borderRadius: 3,
  },
  checklistContainer: {
    gap: 0,
  },
  notesInput: {
    fontSize: 15,
    color: Colors.light.text,
    minHeight: 100,
    lineHeight: 22,
  },
  buttonContainer: {
    padding: 16,
    marginTop: 24,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.success,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  bottomPadding: {
    height: 40,
  },
});
