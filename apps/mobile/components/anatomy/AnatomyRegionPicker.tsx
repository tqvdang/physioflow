import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import {
  syncAnatomyRegions,
  getRegionsByView,
} from '@/lib/sync/anatomySync';
import type { AnatomyRegion } from '@/src/services/api/anatomyApi';

interface AnatomyRegionPickerProps {
  /** Currently selected region ID */
  value?: string;
  /** Callback when a region is selected */
  onChange: (region: AnatomyRegion | null) => void;
  /** Filter by view: "front" or "back" */
  view?: 'front' | 'back';
  /** Show Vietnamese labels instead of English */
  useVietnamese?: boolean;
  /** Placeholder text for the picker */
  placeholder?: string;
}

interface SectionData {
  title: string;
  data: AnatomyRegion[];
}

export function AnatomyRegionPicker({
  value,
  onChange,
  view,
  useVietnamese = false,
  placeholder,
}: AnatomyRegionPickerProps) {
  const [regions, setRegions] = useState<AnatomyRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadRegions = async () => {
      try {
        const data = view
          ? await getRegionsByView(view)
          : await syncAnatomyRegions();
        setRegions(data);
      } catch (error) {
        console.error('Failed to load anatomy regions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRegions();
  }, [view]);

  const selectedRegion = useMemo(
    () => regions.find((r) => r.id === value) ?? null,
    [regions, value]
  );

  const filteredRegions = useMemo(() => {
    if (!searchQuery.trim()) return regions;
    const query = searchQuery.toLowerCase();
    return regions.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.name_vi.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query)
    );
  }, [regions, searchQuery]);

  const sections: SectionData[] = useMemo(() => {
    const grouped = filteredRegions.reduce(
      (acc, region) => {
        const category = region.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(region);
        return acc;
      },
      {} as Record<string, AnatomyRegion[]>
    );

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [filteredRegions]);

  const getRegionLabel = useCallback(
    (region: AnatomyRegion) => {
      return useVietnamese ? region.name_vi : region.name;
    },
    [useVietnamese]
  );

  const handleSelect = useCallback(
    (region: AnatomyRegion) => {
      onChange(region);
      setModalVisible(false);
      setSearchQuery('');
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

  const displayText = selectedRegion
    ? getRegionLabel(selectedRegion)
    : placeholder || (useVietnamese ? 'Chon vung' : 'Select region');

  return (
    <View>
      {/* Picker button */}
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.pickerContent}>
          <Ionicons
            name="body-outline"
            size={20}
            color={selectedRegion ? Colors.light.tint : Colors.light.textSecondary}
          />
          <Text
            style={[
              styles.pickerText,
              !selectedRegion && styles.pickerPlaceholder,
            ]}
          >
            {displayText}
          </Text>
        </View>
        <View style={styles.pickerRight}>
          {selectedRegion && (
            <TouchableOpacity
              onPress={handleClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={Colors.light.textSecondary}
              />
            </TouchableOpacity>
          )}
          <Ionicons
            name="chevron-down"
            size={20}
            color={Colors.light.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {/* Selection modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setModalVisible(false);
          setSearchQuery('');
        }}
      >
        <View style={styles.modalContainer}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                setSearchQuery('');
              }}
            >
              <Text style={styles.modalCancel}>
                {useVietnamese ? 'Huy' : 'Cancel'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {useVietnamese ? 'Chon vung co the' : 'Select Body Region'}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={18}
              color={Colors.light.textSecondary}
            />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                useVietnamese ? 'Tim kiem vung...' : 'Search regions...'
              }
              placeholderTextColor={Colors.light.textSecondary}
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={Colors.light.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* View filter toggle */}
          {!view && (
            <View style={styles.viewFilterRow}>
              <Text style={styles.viewFilterLabel}>
                {useVietnamese ? 'Hien thi:' : 'View:'}
              </Text>
              <Text style={styles.viewFilterValue}>
                {useVietnamese ? 'Tat ca' : 'All regions'}
              </Text>
            </View>
          )}

          {/* Region list */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.light.tint} />
            </View>
          ) : sections.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="search-outline"
                size={48}
                color={Colors.light.border}
              />
              <Text style={styles.emptyText}>
                {useVietnamese
                  ? 'Khong tim thay vung nao'
                  : 'No regions found'}
              </Text>
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderSectionHeader={({ section: { title } }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>
                    {title.replace(/_/g, ' ')}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => {
                const isSelected = item.id === value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.regionItem,
                      isSelected && styles.regionItemSelected,
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.regionInfo}>
                      <Text
                        style={[
                          styles.regionName,
                          isSelected && styles.regionNameSelected,
                        ]}
                      >
                        {getRegionLabel(item)}
                      </Text>
                      {useVietnamese ? (
                        <Text style={styles.regionNameSecondary}>
                          {item.name}
                        </Text>
                      ) : (
                        <Text style={styles.regionNameSecondary}>
                          {item.name_vi}
                        </Text>
                      )}
                    </View>
                    <View style={styles.regionMeta}>
                      {item.side && (
                        <View style={styles.sideBadge}>
                          <Text style={styles.sideBadgeText}>
                            {item.side}
                          </Text>
                        </View>
                      )}
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={Colors.light.tint}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              stickySectionHeadersEnabled
              style={styles.sectionList}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pickerText: {
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
  },
  pickerPlaceholder: {
    color: Colors.light.textSecondary,
  },
  pickerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalCancel: {
    color: Colors.light.tint,
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.light.text,
  },
  headerSpacer: {
    width: 50,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
    padding: 0,
  },
  viewFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  viewFilterLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  viewFilterValue: {
    fontSize: 13,
    color: Colors.light.tint,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  sectionList: {
    flex: 1,
  },
  sectionHeader: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  regionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  regionItemSelected: {
    backgroundColor: Colors.light.tint + '08',
  },
  regionInfo: {
    flex: 1,
  },
  regionName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.light.text,
  },
  regionNameSelected: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  regionNameSecondary: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  regionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sideBadge: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sideBadgeText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});
