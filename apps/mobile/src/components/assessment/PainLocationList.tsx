import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';

// Simplified types for mobile (no interactive diagram)
interface PainLocation {
  id: string;
  severity: number;
  description?: string;
}

interface AnatomyRegionOption {
  id: string;
  label: string;
  labelVi: string;
  category: string;
}

const REGION_OPTIONS: AnatomyRegionOption[] = [
  // Head & Neck
  { id: 'head', label: 'Head', labelVi: 'Dau', category: 'Head & Neck' },
  { id: 'neck_front', label: 'Neck (Front)', labelVi: 'Co (truoc)', category: 'Head & Neck' },
  { id: 'neck_back', label: 'Neck (Back)', labelVi: 'Co (sau)', category: 'Head & Neck' },
  { id: 'cervical_spine', label: 'Cervical Spine', labelVi: 'Cot song co', category: 'Head & Neck' },
  // Shoulders & Arms
  { id: 'shoulder_left', label: 'Left Shoulder', labelVi: 'Vai trai', category: 'Shoulders & Arms' },
  { id: 'shoulder_right', label: 'Right Shoulder', labelVi: 'Vai phai', category: 'Shoulders & Arms' },
  { id: 'elbow_left', label: 'Left Elbow', labelVi: 'Khuyu tay trai', category: 'Shoulders & Arms' },
  { id: 'elbow_right', label: 'Right Elbow', labelVi: 'Khuyu tay phai', category: 'Shoulders & Arms' },
  { id: 'wrist_hand_left', label: 'Left Wrist/Hand', labelVi: 'Co tay trai', category: 'Shoulders & Arms' },
  { id: 'wrist_hand_right', label: 'Right Wrist/Hand', labelVi: 'Co tay phai', category: 'Shoulders & Arms' },
  // Trunk
  { id: 'chest_left', label: 'Left Chest', labelVi: 'Nguc trai', category: 'Trunk' },
  { id: 'chest_right', label: 'Right Chest', labelVi: 'Nguc phai', category: 'Trunk' },
  { id: 'thoracic_spine_upper', label: 'Upper Back', labelVi: 'Lung tren', category: 'Trunk' },
  { id: 'thoracic_spine_lower', label: 'Mid Back', labelVi: 'Lung giua', category: 'Trunk' },
  { id: 'lumbar_spine', label: 'Lower Back', labelVi: 'That lung', category: 'Trunk' },
  { id: 'abdomen_upper', label: 'Upper Abdomen', labelVi: 'Bung tren', category: 'Trunk' },
  { id: 'abdomen_lower', label: 'Lower Abdomen', labelVi: 'Bung duoi', category: 'Trunk' },
  { id: 'sacrum', label: 'Sacrum', labelVi: 'Xuong cung', category: 'Trunk' },
  // Hips & Pelvis
  { id: 'hip_left', label: 'Left Hip', labelVi: 'Hong trai', category: 'Hips & Pelvis' },
  { id: 'hip_right', label: 'Right Hip', labelVi: 'Hong phai', category: 'Hips & Pelvis' },
  { id: 'gluteal_left', label: 'Left Gluteal', labelVi: 'Mong trai', category: 'Hips & Pelvis' },
  { id: 'gluteal_right', label: 'Right Gluteal', labelVi: 'Mong phai', category: 'Hips & Pelvis' },
  // Legs
  { id: 'thigh_left_front', label: 'Left Thigh (Front)', labelVi: 'Dui trai (truoc)', category: 'Legs' },
  { id: 'thigh_right_front', label: 'Right Thigh (Front)', labelVi: 'Dui phai (truoc)', category: 'Legs' },
  { id: 'thigh_left_back', label: 'Left Hamstring', labelVi: 'Dui trai (sau)', category: 'Legs' },
  { id: 'thigh_right_back', label: 'Right Hamstring', labelVi: 'Dui phai (sau)', category: 'Legs' },
  { id: 'knee_left', label: 'Left Knee', labelVi: 'Goi trai', category: 'Legs' },
  { id: 'knee_right', label: 'Right Knee', labelVi: 'Goi phai', category: 'Legs' },
  { id: 'calf_left', label: 'Left Calf', labelVi: 'Bap chan trai', category: 'Legs' },
  { id: 'calf_right', label: 'Right Calf', labelVi: 'Bap chan phai', category: 'Legs' },
  { id: 'ankle_left', label: 'Left Ankle', labelVi: 'Co chan trai', category: 'Legs' },
  { id: 'ankle_right', label: 'Right Ankle', labelVi: 'Co chan phai', category: 'Legs' },
  { id: 'foot_left', label: 'Left Foot', labelVi: 'Ban chan trai', category: 'Legs' },
  { id: 'foot_right', label: 'Right Foot', labelVi: 'Ban chan phai', category: 'Legs' },
];

function getSeverityColor(severity: number): string {
  if (severity <= 2) return '#FFEB3B';
  if (severity <= 4) return '#FF9800';
  if (severity <= 6) return '#FF5722';
  if (severity <= 8) return '#F44336';
  return '#B71C1C';
}

function getSeverityLabel(severity: number): string {
  if (severity <= 2) return 'Mild';
  if (severity <= 4) return 'Moderate';
  if (severity <= 6) return 'Moderate-Severe';
  if (severity <= 8) return 'Severe';
  return 'Extreme';
}

interface PainLocationListProps {
  /** Current pain locations */
  painLocations: PainLocation[];
  /** Callback when locations change */
  onChange: (locations: PainLocation[]) => void;
  /** Whether to show Vietnamese labels */
  useVietnamese?: boolean;
}

/**
 * PainLocationList is a simplified mobile component for entering pain locations.
 *
 * Instead of an interactive diagram (complex on mobile), it provides:
 * - A categorized region selector
 * - Severity slider (0-10)
 * - Description text input
 * - List of marked locations with edit/remove
 */
export function PainLocationList({
  painLocations,
  onChange,
  useVietnamese = false,
}: PainLocationListProps) {
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [severity, setSeverity] = useState(5);
  const [description, setDescription] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const openAddModal = useCallback(() => {
    setSelectedRegionId(null);
    setSeverity(5);
    setDescription('');
    setEditingIndex(null);
    setAddModalVisible(true);
  }, []);

  const openEditModal = useCallback(
    (index: number) => {
      const loc = painLocations[index];
      setSelectedRegionId(loc.id);
      setSeverity(loc.severity);
      setDescription(loc.description ?? '');
      setEditingIndex(index);
      setAddModalVisible(true);
    },
    [painLocations]
  );

  const handleSave = useCallback(() => {
    if (!selectedRegionId || severity <= 0) return;

    const newLocation: PainLocation = {
      id: selectedRegionId,
      severity,
      description: description.trim() || undefined,
    };

    let updated: PainLocation[];
    if (editingIndex !== null) {
      updated = [...painLocations];
      updated[editingIndex] = newLocation;
    } else {
      // Remove if already exists (deduplicate)
      updated = painLocations.filter((l) => l.id !== selectedRegionId);
      updated.push(newLocation);
    }

    onChange(updated);
    setAddModalVisible(false);
  }, [selectedRegionId, severity, description, editingIndex, painLocations, onChange]);

  const handleRemove = useCallback(
    (index: number) => {
      const updated = painLocations.filter((_, i) => i !== index);
      onChange(updated);
    },
    [painLocations, onChange]
  );

  const getRegionLabel = (id: string) => {
    const option = REGION_OPTIONS.find((r) => r.id === id);
    if (!option) return id;
    return useVietnamese ? option.labelVi : option.label;
  };

  // Group regions by category for the selector
  const categories = REGION_OPTIONS.reduce((acc, region) => {
    if (!acc[region.category]) acc[region.category] = [];
    acc[region.category].push(region);
    return acc;
  }, {} as Record<string, AnatomyRegionOption[]>);

  const alreadyMarkedIds = new Set(painLocations.map((l) => l.id));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {useVietnamese ? 'Vi tri dau' : 'Pain Locations'}
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>
            + {useVietnamese ? 'Them' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pain locations list */}
      {painLocations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {useVietnamese
              ? 'Chua co vi tri dau nao. Nhan "Them" de bat dau.'
              : 'No pain locations marked yet. Tap "Add" to start.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={painLocations}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View style={styles.locationItem}>
              <TouchableOpacity
                style={styles.locationContent}
                onPress={() => openEditModal(index)}
              >
                <View style={styles.locationInfo}>
                  <View
                    style={[
                      styles.severityDot,
                      { backgroundColor: getSeverityColor(item.severity) },
                    ]}
                  />
                  <View>
                    <Text style={styles.locationName}>
                      {getRegionLabel(item.id)}
                    </Text>
                    {item.description && (
                      <Text style={styles.locationDescription} numberOfLines={1}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.severityBadge}>
                  <Text style={styles.severityBadgeText}>
                    {item.severity}/10
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemove(index)}
              >
                <Text style={styles.removeButtonText}>X</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
              <Text style={styles.modalCancel}>
                {useVietnamese ? 'Huy' : 'Cancel'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingIndex !== null
                ? useVietnamese ? 'Sua vi tri dau' : 'Edit Pain Location'
                : useVietnamese ? 'Them vi tri dau' : 'Add Pain Location'}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!selectedRegionId}
            >
              <Text
                style={[
                  styles.modalSave,
                  !selectedRegionId && styles.modalSaveDisabled,
                ]}
              >
                {useVietnamese ? 'Luu' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Region selector */}
            <Text style={styles.sectionTitle}>
              {useVietnamese ? 'Vung co the' : 'Body Region'}
            </Text>
            {Object.entries(categories).map(([category, regions]) => (
              <View key={category} style={styles.categoryGroup}>
                <Text style={styles.categoryLabel}>{category}</Text>
                <View style={styles.regionGrid}>
                  {regions.map((region) => {
                    const isSelected = selectedRegionId === region.id;
                    const isMarked =
                      !isSelected &&
                      editingIndex === null &&
                      alreadyMarkedIds.has(region.id);
                    return (
                      <TouchableOpacity
                        key={region.id}
                        style={[
                          styles.regionChip,
                          isSelected && styles.regionChipSelected,
                          isMarked && styles.regionChipMarked,
                        ]}
                        onPress={() => setSelectedRegionId(region.id)}
                        disabled={isMarked}
                      >
                        <Text
                          style={[
                            styles.regionChipText,
                            isSelected && styles.regionChipTextSelected,
                            isMarked && styles.regionChipTextMarked,
                          ]}
                        >
                          {useVietnamese ? region.labelVi : region.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* Severity */}
            {selectedRegionId && (
              <>
                <Text style={styles.sectionTitle}>
                  {useVietnamese ? 'Muc do dau (0-10)' : 'Severity (0-10)'}
                </Text>
                <View style={styles.severityRow}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={[
                        styles.severityButton,
                        severity === v && {
                          backgroundColor: getSeverityColor(v),
                          borderColor: getSeverityColor(v),
                        },
                      ]}
                      onPress={() => setSeverity(v)}
                    >
                      <Text
                        style={[
                          styles.severityButtonText,
                          severity === v && styles.severityButtonTextActive,
                        ]}
                      >
                        {v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.severityLabelText}>
                  {getSeverityLabel(severity)}
                </Text>

                {/* Description */}
                <Text style={styles.sectionTitle}>
                  {useVietnamese ? 'Mo ta' : 'Description'}
                </Text>
                <TextInput
                  style={styles.descriptionInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={
                    useVietnamese
                      ? 'Mo ta con dau (VD: nhoi, am i, lan rong...)'
                      : 'Describe the pain (e.g., sharp, dull, radiating...)'
                  }
                  multiline
                  numberOfLines={3}
                />
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  title: { fontSize: 16, fontWeight: '600' },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: '#999', fontSize: 14, textAlign: 'center' },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
  },
  locationContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  severityDot: { width: 12, height: 12, borderRadius: 6 },
  locationName: { fontSize: 14, fontWeight: '500' },
  locationDescription: { fontSize: 12, color: '#666', marginTop: 2 },
  severityBadge: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  severityBadgeText: { fontSize: 12, color: '#333' },
  removeButton: {
    marginLeft: 12,
    padding: 6,
  },
  removeButtonText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
  // Modal
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCancel: { color: '#3B82F6', fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalSave: { color: '#3B82F6', fontSize: 16, fontWeight: '600' },
  modalSaveDisabled: { color: '#ccc' },
  modalContent: { flex: 1, padding: 16 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  categoryGroup: { marginBottom: 12 },
  categoryLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  regionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  regionChip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f9f9f9',
  },
  regionChipSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  regionChipMarked: {
    borderColor: '#ddd',
    backgroundColor: '#f0f0f0',
    opacity: 0.5,
  },
  regionChipText: { fontSize: 13, color: '#333' },
  regionChipTextSelected: { color: '#3B82F6', fontWeight: '600' },
  regionChipTextMarked: { color: '#999' },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  severityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  severityButtonText: { fontSize: 12, color: '#333' },
  severityButtonTextActive: { color: '#fff', fontWeight: '700' },
  severityLabelText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
