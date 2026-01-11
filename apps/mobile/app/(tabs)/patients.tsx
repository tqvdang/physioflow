import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  lastVisit?: string;
  nextAppointment?: string;
}

// Mock data for development
const MOCK_PATIENTS: Patient[] = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Smith',
    lastVisit: '2024-01-08',
    nextAppointment: '2024-01-15',
  },
  {
    id: '2',
    firstName: 'Sarah',
    lastName: 'Johnson',
    lastVisit: '2024-01-09',
    nextAppointment: '2024-01-12',
  },
  {
    id: '3',
    firstName: 'Michael',
    lastName: 'Brown',
    lastVisit: '2024-01-05',
  },
  {
    id: '4',
    firstName: 'Emily',
    lastName: 'Davis',
    lastVisit: '2024-01-10',
    nextAppointment: '2024-01-17',
  },
  {
    id: '5',
    firstName: 'David',
    lastName: 'Wilson',
    lastVisit: '2023-12-28',
  },
];

export default function PatientsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients] = useState<Patient[]>(MOCK_PATIENTS);

  const filteredPatients = patients.filter((patient) => {
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const handlePatientPress = (patient: Patient) => {
    router.push(`/patient/${patient.id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderPatient = ({ item }: { item: Patient }) => (
    <Pressable
      style={styles.patientCard}
      onPress={() => handlePatientPress(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.firstName[0]}
          {item.lastName[0]}
        </Text>
      </View>

      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>
          {item.firstName} {item.lastName}
        </Text>
        <View style={styles.patientMeta}>
          {item.lastVisit && (
            <Text style={styles.metaText}>
              Last visit: {formatDate(item.lastVisit)}
            </Text>
          )}
          {item.nextAppointment && (
            <Text style={[styles.metaText, styles.nextAppointment]}>
              Next: {formatDate(item.nextAppointment)}
            </Text>
          )}
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={Colors.light.textSecondary}
      />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color={Colors.light.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search patients..."
            placeholderTextColor={Colors.light.textSecondary}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons
                name="close-circle"
                size={20}
                color={Colors.light.textSecondary}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Patients list */}
      <FlatList
        data={filteredPatients}
        renderItem={renderPatient}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="people-outline"
              size={48}
              color={Colors.light.textSecondary}
            />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No patients found' : 'No patients yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Try a different search term'
                : 'Add your first patient to get started'}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <Pressable style={styles.fab}>
        <Ionicons name="add" size={28} color={Colors.light.background} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.tint + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  patientMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  nextAppointment: {
    color: Colors.light.tint,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
