import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface ProtocolTemplate {
  id: string;
  protocolName: string;
  protocolNameVi: string;
  description: string;
  descriptionVi: string;
  frequency: string;
  durationWeeks: number;
  exerciseCount: number;
  condition: string;
}

const PROTOCOL_TEMPLATES: ProtocolTemplate[] = [
  {
    id: 'proto-1',
    protocolName: 'ACL Reconstruction Rehabilitation',
    protocolNameVi: 'Phuc hoi chuc nang tai tao day chang cheo truoc',
    description: 'Post-surgical ACL reconstruction rehab protocol. Progressive loading through 4 phases.',
    descriptionVi: 'Phac do phuc hoi sau phau thuat tai tao day chang cheo truoc.',
    frequency: '3x/week',
    durationWeeks: 24,
    exerciseCount: 5,
    condition: 'Knee',
  },
  {
    id: 'proto-2',
    protocolName: 'Low Back Pain Management',
    protocolNameVi: 'Dieu tri dau lung duoi',
    description: 'Evidence-based protocol for chronic low back pain with core stabilization focus.',
    descriptionVi: 'Phac do dua tren bang chung cho dau lung duoi man tinh.',
    frequency: '2-3x/week',
    durationWeeks: 8,
    exerciseCount: 5,
    condition: 'Spine',
  },
  {
    id: 'proto-3',
    protocolName: 'Rotator Cuff Repair Recovery',
    protocolNameVi: 'Phuc hoi sua chua chop xoay',
    description: 'Post-operative rotator cuff repair protocol with progressive shoulder mobilization.',
    descriptionVi: 'Phac do sau phau thuat sua chua chop xoay.',
    frequency: '3x/week',
    durationWeeks: 16,
    exerciseCount: 4,
    condition: 'Shoulder',
  },
  {
    id: 'proto-4',
    protocolName: 'Total Knee Replacement Rehab',
    protocolNameVi: 'Phuc hoi thay khop goi toan phan',
    description: 'Comprehensive rehabilitation following total knee arthroplasty.',
    descriptionVi: 'Phuc hoi toan dien sau phau thuat thay khop goi toan phan.',
    frequency: '5x/week then 3x/week',
    durationWeeks: 12,
    exerciseCount: 5,
    condition: 'Knee',
  },
  {
    id: 'proto-5',
    protocolName: 'Stroke Rehabilitation Protocol',
    protocolNameVi: 'Phac do phuc hoi dot quy',
    description: 'Neurological rehabilitation protocol for post-stroke motor recovery.',
    descriptionVi: 'Phac do phuc hoi than kinh cho phuc hoi van dong sau dot quy.',
    frequency: '5x/week',
    durationWeeks: 12,
    exerciseCount: 5,
    condition: 'Neurological',
  },
];

const CONDITIONS = ['All', 'Knee', 'Spine', 'Shoulder', 'Neurological'];

export default function ProtocolLibraryScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('All');

  const filteredProtocols = useMemo(() => {
    return PROTOCOL_TEMPLATES.filter((protocol) => {
      const matchesCondition =
        selectedCondition === 'All' || protocol.condition === selectedCondition;

      const matchesSearch =
        searchQuery.length === 0 ||
        protocol.protocolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        protocol.protocolNameVi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        protocol.condition.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCondition && matchesSearch;
    });
  }, [searchQuery, selectedCondition]);

  const handleProtocolPress = (protocol: ProtocolTemplate) => {
    router.push(`/patient/protocol/${protocol.id}`);
  };

  const getConditionIcon = (condition: string): keyof typeof Ionicons.glyphMap => {
    switch (condition) {
      case 'Knee':
        return 'body-outline';
      case 'Spine':
        return 'accessibility-outline';
      case 'Shoulder':
        return 'hand-left-outline';
      case 'Neurological':
        return 'pulse-outline';
      default:
        return 'medkit-outline';
    }
  };

  const renderProtocolCard = ({ item }: { item: ProtocolTemplate }) => (
    <TouchableOpacity
      style={styles.protocolCard}
      onPress={() => handleProtocolPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.conditionIcon}>
          <Ionicons
            name={getConditionIcon(item.condition)}
            size={24}
            color={Colors.light.tint}
          />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.protocolName} numberOfLines={2}>
            {item.protocolName}
          </Text>
          <Text style={styles.protocolNameVi} numberOfLines={1}>
            {item.protocolNameVi}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.footerBadge}>
          <Ionicons name="calendar-outline" size={12} color={Colors.light.textSecondary} />
          <Text style={styles.footerText}>{item.durationWeeks} weeks</Text>
        </View>
        <View style={styles.footerBadge}>
          <Ionicons name="repeat-outline" size={12} color={Colors.light.textSecondary} />
          <Text style={styles.footerText}>{item.frequency}</Text>
        </View>
        <View style={styles.footerBadge}>
          <Ionicons name="barbell-outline" size={12} color={Colors.light.textSecondary} />
          <Text style={styles.footerText}>{item.exerciseCount} exercises</Text>
        </View>
      </View>

      {patientId && (
        <TouchableOpacity
          style={styles.assignButton}
          onPress={() => {
            // In production this would create a patient_protocol record
            router.push(`/patient/protocol/${item.id}`);
          }}
        >
          <Ionicons name="add-circle-outline" size={18} color={Colors.light.background} />
          <Text style={styles.assignButtonText}>Assign to Patient</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search protocols..."
            placeholderTextColor={Colors.light.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Condition filter chips */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CONDITIONS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: condition }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedCondition === condition && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCondition(condition)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCondition === condition && styles.filterChipTextActive,
                ]}
              >
                {condition}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Protocol list */}
      <FlatList
        data={filteredProtocols}
        keyExtractor={(item) => item.id}
        renderItem={renderProtocolCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={Colors.light.border} />
            <Text style={styles.emptyText}>No protocols found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your search or filter criteria
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
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: Colors.light.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
    padding: 0,
  },
  filterContainer: {
    backgroundColor: Colors.light.background,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filterChipActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.light.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  protocolCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  conditionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.light.tint + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  protocolName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    lineHeight: 22,
  },
  protocolNameVi: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginTop: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
    gap: 6,
  },
  assignButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.background,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
