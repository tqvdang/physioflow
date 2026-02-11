import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { formatVND } from '@/lib/currency';

export interface ServiceCode {
  code: string;
  name: string;
  price: number;
}

export const SERVICE_CODES: ServiceCode[] = [
  { code: 'PT001', name: 'Tap luyen tri lieu', price: 250000 },
  { code: 'PT002', name: 'Lieu phap thu cong', price: 300000 },
  { code: 'PT003', name: 'Dien tri lieu', price: 200000 },
  { code: 'PT004', name: 'Sieu am tri lieu', price: 180000 },
  { code: 'PT005', name: 'Keo gian cot song', price: 350000 },
  { code: 'PT006', name: 'Xoa bop tri lieu', price: 220000 },
  { code: 'PT007', name: 'Tap di lai - phuc hoi chuc nang', price: 280000 },
  { code: 'PT008', name: 'Danh gia ban dau', price: 400000 },
];

interface ServiceCodePickerProps {
  selectedCode: ServiceCode | null;
  onSelect: (service: ServiceCode) => void;
}

export function ServiceCodePicker({ selectedCode, onSelect }: ServiceCodePickerProps) {
  const [visible, setVisible] = useState(false);

  const handleSelect = (service: ServiceCode) => {
    onSelect(service);
    setVisible(false);
  };

  const renderServiceItem = ({ item }: { item: ServiceCode }) => (
    <Pressable
      style={[
        styles.serviceItem,
        selectedCode?.code === item.code && styles.serviceItemSelected,
      ]}
      onPress={() => handleSelect(item)}
    >
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceCode}>{item.code}</Text>
        <Text style={styles.serviceName}>{item.name}</Text>
      </View>
      <Text style={styles.servicePrice}>{formatVND(item.price)}</Text>
      {selectedCode?.code === item.code && (
        <Ionicons name="checkmark-circle" size={22} color={Colors.light.tint} />
      )}
    </Pressable>
  );

  return (
    <View>
      <Pressable style={styles.trigger} onPress={() => setVisible(true)}>
        {selectedCode ? (
          <View style={styles.selectedDisplay}>
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedCode}>{selectedCode.code}</Text>
              <Text style={styles.selectedName}>{selectedCode.name}</Text>
            </View>
            <Text style={styles.selectedPrice}>{formatVND(selectedCode.price)}</Text>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="add-circle-outline" size={20} color={Colors.light.textSecondary} />
            <Text style={styles.placeholderText}>Chon dich vu</Text>
          </View>
        )}
        <Ionicons name="chevron-down" size={20} color={Colors.light.textSecondary} />
      </Pressable>

      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chon dich vu</Text>
            <Pressable onPress={() => setVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </Pressable>
          </View>

          <FlatList
            data={SERVICE_CODES}
            renderItem={renderServiceItem}
            keyExtractor={(item) => item.code}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  selectedDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 8,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedCode: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  selectedName: {
    fontSize: 15,
    color: Colors.light.text,
    marginTop: 2,
  },
  selectedPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginRight: 8,
  },
  placeholder: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  serviceItemSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tint + '08',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceCode: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  serviceName: {
    fontSize: 15,
    color: Colors.light.text,
    marginTop: 2,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginRight: 12,
  },
  separator: {
    height: 8,
  },
});
