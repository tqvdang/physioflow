import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export interface ConflictField {
  label: string;
  localValue: string;
  serverValue: string;
}

interface SyncConflictModalProps {
  visible: boolean;
  entityType: string;
  fields: ConflictField[];
  onResolve: (resolution: 'server' | 'client') => void;
  onCancel: () => void;
}

function formatEntityType(entityType: string): string {
  return entityType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function SyncConflictModal({
  visible,
  entityType,
  fields,
  onResolve,
  onCancel,
}: SyncConflictModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="warning" size={24} color={Colors.light.warning} />
          </View>
          <Text style={styles.title}>Sync Conflict</Text>
          <Text style={styles.subtitle}>
            The {formatEntityType(entityType)} was modified on both this device
            and the server. Choose which version to keep.
          </Text>
        </View>

        {/* Comparison table */}
        <ScrollView style={styles.scrollContainer}>
          {/* Column headers */}
          <View style={styles.columnHeaders}>
            <View style={styles.fieldLabelColumn}>
              <Text style={styles.columnHeaderText}>Field</Text>
            </View>
            <View style={styles.valueColumn}>
              <View style={styles.columnHeaderBadge}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={14}
                  color={Colors.light.tint}
                />
                <Text style={[styles.columnHeaderText, { color: Colors.light.tint }]}>
                  This Device
                </Text>
              </View>
            </View>
            <View style={styles.valueColumn}>
              <View style={styles.columnHeaderBadge}>
                <Ionicons
                  name="cloud-outline"
                  size={14}
                  color={Colors.light.error}
                />
                <Text style={[styles.columnHeaderText, { color: Colors.light.error }]}>
                  Server
                </Text>
              </View>
            </View>
          </View>

          {/* Field rows */}
          {fields.map((field, index) => {
            const hasConflict = field.localValue !== field.serverValue;
            return (
              <View
                key={field.label}
                style={[
                  styles.fieldRow,
                  hasConflict && styles.fieldRowConflict,
                  index % 2 === 0 && styles.fieldRowAlt,
                ]}
              >
                <View style={styles.fieldLabelColumn}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  {hasConflict && (
                    <Ionicons
                      name="alert-circle"
                      size={14}
                      color={Colors.light.warning}
                    />
                  )}
                </View>
                <View style={styles.valueColumn}>
                  <Text
                    style={[
                      styles.fieldValue,
                      hasConflict && styles.fieldValueConflict,
                    ]}
                    numberOfLines={2}
                  >
                    {field.localValue || '-'}
                  </Text>
                </View>
                <View style={styles.valueColumn}>
                  <Text
                    style={[
                      styles.fieldValue,
                      hasConflict && styles.fieldValueConflict,
                    ]}
                    numberOfLines={2}
                  >
                    {field.serverValue || '-'}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, styles.serverButton]}
            onPress={() => onResolve('server')}
          >
            <Ionicons
              name="cloud-download-outline"
              size={20}
              color={Colors.light.background}
            />
            <Text style={styles.actionButtonText}>Use Server Version</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.clientButton]}
            onPress={() => onResolve('client')}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={20}
              color={Colors.light.background}
            />
            <Text style={styles.actionButtonText}>Use This Device</Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 48,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  columnHeaders: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.border,
    marginBottom: 4,
  },
  fieldLabelColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueColumn: {
    flex: 1.2,
    paddingHorizontal: 4,
  },
  columnHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  columnHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  fieldRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  fieldRowConflict: {
    backgroundColor: Colors.light.warning + '08',
  },
  fieldRowAlt: {
    backgroundColor: Colors.light.backgroundSecondary + '50',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.text,
  },
  fieldValue: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 18,
  },
  fieldValueConflict: {
    fontWeight: '600',
  },
  actions: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  serverButton: {
    backgroundColor: Colors.light.tint,
  },
  clientButton: {
    backgroundColor: Colors.light.warning,
  },
  actionButtonText: {
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
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
});
