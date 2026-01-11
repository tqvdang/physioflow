import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { QuickActionButton } from '@/components';
import { isOnline, getPendingSyncCount, syncPendingItems } from '@/lib/offline';

interface SessionItem {
  id: string;
  patientName: string;
  time: string;
  duration: number;
  type: string;
  status: 'scheduled' | 'in_progress' | 'completed';
}

// Mock data for development
const MOCK_SESSIONS: SessionItem[] = [
  {
    id: '1',
    patientName: 'John Smith',
    time: '09:00 AM',
    duration: 45,
    type: 'Follow-up',
    status: 'completed',
  },
  {
    id: '2',
    patientName: 'Sarah Johnson',
    time: '10:00 AM',
    duration: 60,
    type: 'Initial Evaluation',
    status: 'in_progress',
  },
  {
    id: '3',
    patientName: 'Michael Brown',
    time: '11:30 AM',
    duration: 45,
    type: 'Follow-up',
    status: 'scheduled',
  },
  {
    id: '4',
    patientName: 'Emily Davis',
    time: '02:00 PM',
    duration: 30,
    type: 'Telehealth',
    status: 'scheduled',
  },
];

export default function ScheduleScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionItem[]>(MOCK_SESSIONS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const isConnected = await isOnline();
    setOnline(isConnected);
    const pending = await getPendingSyncCount();
    setPendingSync(pending);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkStatus();
    if (online) {
      await syncPendingItems();
      await checkStatus();
    }
    setIsRefreshing(false);
  };

  const handleSessionPress = (session: SessionItem) => {
    router.push(`/patient/session/${session.id}`);
  };

  const getStatusColor = (status: SessionItem['status']) => {
    switch (status) {
      case 'completed':
        return Colors.light.success;
      case 'in_progress':
        return Colors.light.warning;
      default:
        return Colors.light.textSecondary;
    }
  };

  const getStatusLabel = (status: SessionItem['status']) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Scheduled';
    }
  };

  const renderSession = ({ item }: { item: SessionItem }) => (
    <Pressable
      style={styles.sessionCard}
      onPress={() => handleSessionPress(item)}
    >
      <View style={styles.sessionTime}>
        <Text style={styles.timeText}>{item.time}</Text>
        <Text style={styles.durationText}>{item.duration} min</Text>
      </View>

      <View style={styles.sessionInfo}>
        <Text style={styles.patientName}>{item.patientName}</Text>
        <Text style={styles.sessionType}>{item.type}</Text>
      </View>

      <View style={styles.sessionStatus}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {getStatusLabel(item.status)}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={Colors.light.textSecondary}
        />
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Sync status banner */}
      {(!online || pendingSync > 0) && (
        <View
          style={[
            styles.syncBanner,
            { backgroundColor: online ? Colors.light.warning : Colors.light.error },
          ]}
        >
          <Ionicons
            name={online ? 'cloud-upload-outline' : 'cloud-offline-outline'}
            size={16}
            color={Colors.light.background}
          />
          <Text style={styles.syncText}>
            {online
              ? `${pendingSync} changes pending sync`
              : 'Offline - changes will sync when connected'}
          </Text>
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <QuickActionButton
          icon="add-circle-outline"
          label="New Session"
          onPress={() => {}}
          variant="primary"
          size="small"
        />
        <QuickActionButton
          icon="person-add-outline"
          label="Add Patient"
          onPress={() => router.push('/(tabs)/patients')}
          variant="secondary"
          size="small"
        />
        <QuickActionButton
          icon="sync-outline"
          label="Sync Now"
          onPress={handleRefresh}
          variant="secondary"
          size="small"
          disabled={!online}
        />
      </View>

      {/* Today's header */}
      <View style={styles.dateHeader}>
        <Text style={styles.dateTitle}>Today</Text>
        <Text style={styles.dateSubtitle}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Sessions list */}
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.light.tint}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="calendar-outline"
              size={48}
              color={Colors.light.textSecondary}
            />
            <Text style={styles.emptyTitle}>No sessions today</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to schedule a session
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  syncText: {
    color: Colors.light.background,
    fontSize: 13,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  dateHeader: {
    padding: 16,
  },
  dateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  dateSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
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
  sessionTime: {
    width: 70,
    marginRight: 16,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  durationText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  sessionInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  sessionType: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  sessionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
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
  },
});
