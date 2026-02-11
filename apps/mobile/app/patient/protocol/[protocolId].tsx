import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { ProgressBar, ExerciseCard } from '@/components';
import { queueForSync } from '@/lib/offline';

// Seed protocol data for offline-first access
const SEED_PROTOCOLS = [
  {
    id: 'proto-1',
    protocolName: 'ACL Reconstruction Rehabilitation',
    protocolNameVi: 'Phuc hoi chuc nang tai tao day chang cheo truoc',
    description: 'Post-surgical ACL reconstruction rehab protocol. Progressive loading through 4 phases.',
    descriptionVi: 'Phac do phuc hoi sau phau thuat tai tao day chang cheo truoc. Tang tai trong qua 4 giai doan.',
    frequency: '3x/week',
    durationWeeks: 24,
    progressionCriteria: 'Full ROM, quad strength >80% limb symmetry index',
    goals: [
      { description: 'Restore full range of motion', descriptionVi: 'Phuc hoi tam van dong toan bo' },
      { description: 'Rebuild quadriceps strength', descriptionVi: 'Tai tao suc manh co tu dau' },
      { description: 'Return to sport activities', descriptionVi: 'Tro lai hoat dong the thao' },
    ],
    exercises: [
      { id: 'e1', name: 'Quad Sets', nameVi: 'Co co tu dau', sets: 3, reps: 15, durationSeconds: 0 },
      { id: 'e2', name: 'Straight Leg Raises', nameVi: 'Nang chan thang', sets: 3, reps: 12, durationSeconds: 0 },
      { id: 'e3', name: 'Heel Slides', nameVi: 'Truot got chan', sets: 3, reps: 15, durationSeconds: 0 },
      { id: 'e4', name: 'Wall Squats', nameVi: 'Ngoi xom tuong', sets: 3, reps: 10, durationSeconds: 30, videoUrl: 'https://example.com/wall-squats' },
      { id: 'e5', name: 'Calf Raises', nameVi: 'Nang bap chan', sets: 3, reps: 15, durationSeconds: 0 },
    ],
  },
  {
    id: 'proto-2',
    protocolName: 'Low Back Pain Management',
    protocolNameVi: 'Dieu tri dau lung duoi',
    description: 'Evidence-based protocol for chronic low back pain with core stabilization focus.',
    descriptionVi: 'Phac do dua tren bang chung cho dau lung duoi man tinh, tap trung on dinh co loi.',
    frequency: '2-3x/week',
    durationWeeks: 8,
    progressionCriteria: 'Pain <3/10, Oswestry <20%',
    goals: [
      { description: 'Reduce pain to manageable levels', descriptionVi: 'Giam dau den muc co the kiem soat' },
      { description: 'Improve core stability', descriptionVi: 'Cai thien su on dinh co loi' },
      { description: 'Return to daily activities', descriptionVi: 'Tro lai hoat dong hang ngay' },
    ],
    exercises: [
      { id: 'e1', name: 'Pelvic Tilts', nameVi: 'Nghieng khung chau', sets: 3, reps: 15, durationSeconds: 0 },
      { id: 'e2', name: 'Bird-Dog', nameVi: 'Bai tap chim-cho', sets: 3, reps: 10, durationSeconds: 5, videoUrl: 'https://example.com/bird-dog' },
      { id: 'e3', name: 'Dead Bug', nameVi: 'Bai tap con bo', sets: 3, reps: 10, durationSeconds: 0 },
      { id: 'e4', name: 'Cat-Cow Stretch', nameVi: 'Keo gian meo-bo', sets: 2, reps: 10, durationSeconds: 0 },
      { id: 'e5', name: 'Bridges', nameVi: 'Nang hong', sets: 3, reps: 12, durationSeconds: 5 },
    ],
  },
  {
    id: 'proto-3',
    protocolName: 'Rotator Cuff Repair Recovery',
    protocolNameVi: 'Phuc hoi sua chua chop xoay',
    description: 'Post-operative rotator cuff repair protocol with progressive shoulder mobilization.',
    descriptionVi: 'Phac do sau phau thuat sua chua chop xoay voi van dong vai tien trien.',
    frequency: '3x/week',
    durationWeeks: 16,
    progressionCriteria: 'Full AROM, strength 4+/5, negative impingement tests',
    goals: [
      { description: 'Protect surgical repair', descriptionVi: 'Bao ve vi tri phau thuat' },
      { description: 'Restore shoulder range of motion', descriptionVi: 'Phuc hoi tam van dong vai' },
      { description: 'Rebuild rotator cuff strength', descriptionVi: 'Tai tao suc manh chop xoay' },
    ],
    exercises: [
      { id: 'e1', name: 'Pendulum Exercises', nameVi: 'Bai tap con lac', sets: 3, reps: 10, durationSeconds: 30 },
      { id: 'e2', name: 'Passive ROM', nameVi: 'Van dong thu dong', sets: 3, reps: 10, durationSeconds: 0 },
      { id: 'e3', name: 'Isometric External Rotation', nameVi: 'Xoay ngoai dang tinh', sets: 3, reps: 10, durationSeconds: 5, videoUrl: 'https://example.com/iso-er' },
      { id: 'e4', name: 'Scapular Squeezes', nameVi: 'Ep xuong ba vai', sets: 3, reps: 15, durationSeconds: 5 },
    ],
  },
  {
    id: 'proto-4',
    protocolName: 'Total Knee Replacement Rehab',
    protocolNameVi: 'Phuc hoi thay khop goi toan phan',
    description: 'Comprehensive rehabilitation following total knee arthroplasty.',
    descriptionVi: 'Phuc hoi toan dien sau phau thuat thay khop goi toan phan.',
    frequency: '5x/week (first 6 weeks), then 3x/week',
    durationWeeks: 12,
    progressionCriteria: 'ROM 0-120 degrees, independent ambulation, stair negotiation',
    goals: [
      { description: 'Achieve functional ROM (0-120 degrees)', descriptionVi: 'Dat tam van dong chuc nang (0-120 do)' },
      { description: 'Independent ambulation without assistive device', descriptionVi: 'Di bo doc lap khong can ho tro' },
      { description: 'Return to daily activities', descriptionVi: 'Tro lai hoat dong hang ngay' },
    ],
    exercises: [
      { id: 'e1', name: 'Ankle Pumps', nameVi: 'Bom co chan', sets: 3, reps: 20, durationSeconds: 0 },
      { id: 'e2', name: 'Quad Sets', nameVi: 'Co co tu dau', sets: 3, reps: 15, durationSeconds: 5 },
      { id: 'e3', name: 'Knee Flexion Slides', nameVi: 'Truot gap goi', sets: 3, reps: 15, durationSeconds: 0, videoUrl: 'https://example.com/knee-flexion' },
      { id: 'e4', name: 'Seated Knee Extensions', nameVi: 'Duoi goi ngoi', sets: 3, reps: 12, durationSeconds: 0 },
      { id: 'e5', name: 'Standing Hip Abduction', nameVi: 'Dang hong dung', sets: 3, reps: 10, durationSeconds: 0 },
    ],
  },
  {
    id: 'proto-5',
    protocolName: 'Stroke Rehabilitation Protocol',
    protocolNameVi: 'Phac do phuc hoi dot quy',
    description: 'Neurological rehabilitation protocol for post-stroke motor recovery.',
    descriptionVi: 'Phac do phuc hoi than kinh cho phuc hoi van dong sau dot quy.',
    frequency: '5x/week',
    durationWeeks: 12,
    progressionCriteria: 'Improved Fugl-Meyer score, functional independence measure gains',
    goals: [
      { description: 'Improve motor control of affected side', descriptionVi: 'Cai thien kiem soat van dong ben liet' },
      { description: 'Restore functional mobility', descriptionVi: 'Phuc hoi kha nang di chuyen chuc nang' },
      { description: 'Maximize independence in ADLs', descriptionVi: 'Toi da hoa doc lap trong sinh hoat hang ngay' },
    ],
    exercises: [
      { id: 'e1', name: 'Weight Shifting', nameVi: 'Chuyen doi trong luong', sets: 3, reps: 10, durationSeconds: 10 },
      { id: 'e2', name: 'Seated Reach', nameVi: 'Voi tay khi ngoi', sets: 3, reps: 10, durationSeconds: 0, videoUrl: 'https://example.com/seated-reach' },
      { id: 'e3', name: 'Standing Balance', nameVi: 'Thang bang dung', sets: 3, reps: 5, durationSeconds: 30 },
      { id: 'e4', name: 'Grip Strengthening', nameVi: 'Tang suc manh nam tay', sets: 3, reps: 15, durationSeconds: 0 },
      { id: 'e5', name: 'Gait Training', nameVi: 'Tap di bo', sets: 1, reps: 1, durationSeconds: 600 },
    ],
  },
];

// Mock patient protocol assignment
const MOCK_PATIENT_PROTOCOL = {
  id: 'pp-1',
  patientId: '1',
  protocolId: 'proto-2',
  assignedDate: '2024-01-05',
  currentWeek: 3,
  completedExercises: ['e1', 'e2'],
  progressStatus: 'in_progress' as const,
  notes: 'Patient progressing well. Good compliance with home exercises.',
  version: 1,
};

export default function ProtocolScreen() {
  const { protocolId } = useLocalSearchParams<{ protocolId: string }>();
  const router = useRouter();

  const protocol = SEED_PROTOCOLS.find((p) => p.id === protocolId);
  const patientProtocol =
    MOCK_PATIENT_PROTOCOL.protocolId === protocolId ? MOCK_PATIENT_PROTOCOL : null;

  const [completedExercises, setCompletedExercises] = useState<string[]>(
    patientProtocol?.completedExercises || []
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleExercise = useCallback((exerciseId: string) => {
    setCompletedExercises((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    );
  }, []);

  const handleCompleteSession = async () => {
    if (!protocol || !patientProtocol) return;

    const incompleteCount = protocol.exercises.length - completedExercises.length;
    if (incompleteCount > 0) {
      Alert.alert(
        'Incomplete Exercises',
        `You have ${incompleteCount} incomplete exercises. Mark session as done anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete', onPress: saveProgress },
        ]
      );
    } else {
      saveProgress();
    }
  };

  const saveProgress = async () => {
    if (!patientProtocol) return;
    setIsSaving(true);

    try {
      await queueForSync('patient_protocol' as any, patientProtocol.id, 'update', {
        ...patientProtocol,
        completedExercises,
        updatedAt: new Date().toISOString(),
      });

      Alert.alert('Session Saved', 'Exercise progress has been recorded.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!protocol) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={64} color={Colors.light.border} />
        <Text style={styles.emptyTitle}>Protocol Not Found</Text>
        <Text style={styles.emptySubtitle}>
          This protocol may have been removed or is not available offline.
        </Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const completedCount = completedExercises.length;
  const totalExercises = protocol.exercises.length;

  return (
    <ScrollView style={styles.container}>
      {/* Protocol header */}
      <View style={styles.header}>
        <Text style={styles.protocolName}>{protocol.protocolName}</Text>
        <Text style={styles.protocolNameVi}>{protocol.protocolNameVi}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaBadge}>
            <Ionicons name="calendar-outline" size={14} color={Colors.light.tint} />
            <Text style={styles.metaText}>{protocol.durationWeeks} weeks</Text>
          </View>
          <View style={styles.metaBadge}>
            <Ionicons name="repeat-outline" size={14} color={Colors.light.tint} />
            <Text style={styles.metaText}>{protocol.frequency}</Text>
          </View>
        </View>
      </View>

      {/* Progress section (only if assigned) */}
      {patientProtocol && (
        <View style={styles.section}>
          <ProgressBar
            currentWeek={patientProtocol.currentWeek}
            totalWeeks={protocol.durationWeeks}
            label="Treatment Progress"
          />
        </View>
      )}

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <View style={styles.card}>
          <Text style={styles.descriptionText}>{protocol.description}</Text>
          <Text style={styles.descriptionTextVi}>{protocol.descriptionVi}</Text>
        </View>
      </View>

      {/* Goals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Goals</Text>
        <View style={styles.card}>
          {protocol.goals.map((goal, index) => (
            <View key={index} style={styles.goalRow}>
              <Ionicons name="flag-outline" size={16} color={Colors.light.tint} />
              <View style={styles.goalText}>
                <Text style={styles.goalDescription}>{goal.description}</Text>
                <Text style={styles.goalDescriptionVi}>{goal.descriptionVi}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Exercises */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          {patientProtocol && (
            <Text style={styles.exerciseCount}>
              {completedCount}/{totalExercises} done
            </Text>
          )}
        </View>

        {protocol.exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            id={exercise.id}
            name={exercise.name}
            nameVi={exercise.nameVi}
            sets={exercise.sets}
            reps={exercise.reps}
            durationSeconds={exercise.durationSeconds}
            videoUrl={exercise.videoUrl}
            isCompleted={completedExercises.includes(exercise.id)}
            onToggle={handleToggleExercise}
            disabled={!patientProtocol}
          />
        ))}
      </View>

      {/* Progression criteria */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progression Criteria</Text>
        <View style={styles.card}>
          <Text style={styles.descriptionText}>{protocol.progressionCriteria}</Text>
        </View>
      </View>

      {/* Notes (if assigned) */}
      {patientProtocol?.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.card}>
            <Text style={styles.descriptionText}>{patientProtocol.notes}</Text>
          </View>
        </View>
      )}

      {/* Action button */}
      {patientProtocol ? (
        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.completeButton, isSaving && styles.buttonDisabled]}
            onPress={handleCompleteSession}
            disabled={isSaving}
          >
            <Ionicons name="checkmark-circle" size={24} color={Colors.light.background} />
            <Text style={styles.completeButtonText}>
              {isSaving ? 'Saving...' : 'Complete Session'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.assignButton}
            onPress={() => {
              Alert.alert('Assign Protocol', 'Protocol assignment will be available when connected to a patient context.');
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color={Colors.light.background} />
            <Text style={styles.completeButtonText}>Assign Protocol</Text>
          </Pressable>
        </View>
      )}

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
  protocolName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
  },
  protocolNameVi: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.tint + '10',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: Colors.light.tint,
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
  exerciseCount: {
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
  descriptionText: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
  },
  descriptionTextVi: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginTop: 8,
    fontStyle: 'italic',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  goalText: {
    flex: 1,
  },
  goalDescription: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  goalDescriptionVi: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
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
  assignButton: {
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
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  backButton: {
    marginTop: 24,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.background,
  },
  bottomPadding: {
    height: 40,
  },
});
