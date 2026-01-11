import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { QuickActionButton } from '@/components';

// Mock patient data
const MOCK_PATIENT = {
  id: '1',
  firstName: 'John',
  lastName: 'Smith',
  dateOfBirth: '1985-03-15',
  phone: '(555) 123-4567',
  email: 'john.smith@email.com',
  medicalNotes: 'Lower back pain, history of lumbar strain. Responds well to manual therapy.',
  recentSessions: [
    {
      id: 's1',
      date: '2024-01-08',
      type: 'Follow-up',
      painBefore: 6,
      painAfter: 3,
    },
    {
      id: 's2',
      date: '2024-01-03',
      type: 'Follow-up',
      painBefore: 7,
      painAfter: 4,
    },
    {
      id: 's3',
      date: '2023-12-28',
      type: 'Initial Evaluation',
      painBefore: 8,
      painAfter: 5,
    },
  ],
};

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const patient = MOCK_PATIENT; // In real app, fetch by id

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateAge = (dob: string) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {patient.firstName[0]}
            {patient.lastName[0]}
          </Text>
        </View>
        <Text style={styles.patientName}>
          {patient.firstName} {patient.lastName}
        </Text>
        <Text style={styles.patientAge}>
          {calculateAge(patient.dateOfBirth)} years old
        </Text>
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <QuickActionButton
          icon="calendar-outline"
          label="Schedule"
          onPress={() => {}}
          variant="primary"
          size="small"
        />
        <QuickActionButton
          icon="call-outline"
          label="Call"
          onPress={() => {}}
          variant="secondary"
          size="small"
        />
        <QuickActionButton
          icon="mail-outline"
          label="Email"
          onPress={() => {}}
          variant="secondary"
          size="small"
        />
        <QuickActionButton
          icon="create-outline"
          label="Edit"
          onPress={() => {}}
          variant="secondary"
          size="small"
        />
      </View>

      {/* Contact info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color={Colors.light.textSecondary} />
            <Text style={styles.infoText}>{patient.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color={Colors.light.textSecondary} />
            <Text style={styles.infoText}>{patient.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.light.textSecondary} />
            <Text style={styles.infoText}>DOB: {formatDate(patient.dateOfBirth)}</Text>
          </View>
        </View>
      </View>

      {/* Medical notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medical Notes</Text>
        <View style={styles.card}>
          <Text style={styles.notesText}>{patient.medicalNotes}</Text>
        </View>
      </View>

      {/* Recent sessions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          <Pressable>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        </View>

        {patient.recentSessions.map((session) => (
          <Pressable
            key={session.id}
            style={styles.sessionCard}
            onPress={() => router.push(`/patient/session/${session.id}`)}
          >
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
              <Text style={styles.sessionType}>{session.type}</Text>
            </View>
            <View style={styles.painIndicator}>
              <Text style={styles.painLabel}>Pain</Text>
              <View style={styles.painValues}>
                <Text style={[styles.painValue, { color: Colors.light.error }]}>
                  {session.painBefore}
                </Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.light.textSecondary} />
                <Text style={[styles.painValue, { color: Colors.light.success }]}>
                  {session.painAfter}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
          </Pressable>
        ))}
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
  headerCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.light.background,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.light.background,
  },
  patientName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  patientAge: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
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
  viewAllText: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: '500',
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: Colors.light.text,
  },
  notesText: {
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  sessionType: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  painIndicator: {
    alignItems: 'center',
    marginRight: 12,
  },
  painLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  painValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  painValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
