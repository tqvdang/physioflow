import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { formatVND } from '@/lib/currency';

type InvoiceStatus = 'pending' | 'paid' | 'partially_paid' | 'cancelled';

interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  copayAmount: number;
  insuranceAmount: number;
  status: InvoiceStatus;
}

// Mock data for development
const MOCK_INVOICES: InvoiceListItem[] = [
  {
    id: 'inv1',
    invoiceNumber: 'HD-2024-001',
    invoiceDate: '2024-01-10',
    totalAmount: 800000,
    copayAmount: 160000,
    insuranceAmount: 640000,
    status: 'pending',
  },
  {
    id: 'inv2',
    invoiceNumber: 'HD-2024-002',
    invoiceDate: '2024-01-08',
    totalAmount: 550000,
    copayAmount: 110000,
    insuranceAmount: 440000,
    status: 'paid',
  },
  {
    id: 'inv3',
    invoiceNumber: 'HD-2024-003',
    invoiceDate: '2024-01-05',
    totalAmount: 1200000,
    copayAmount: 240000,
    insuranceAmount: 960000,
    status: 'partially_paid',
  },
  {
    id: 'inv4',
    invoiceNumber: 'HD-2024-004',
    invoiceDate: '2024-01-02',
    totalAmount: 300000,
    copayAmount: 60000,
    insuranceAmount: 240000,
    status: 'cancelled',
  },
];

const STATUS_FILTERS: { value: InvoiceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tat ca' },
  { value: 'pending', label: 'Cho thanh toan' },
  { value: 'paid', label: 'Da thanh toan' },
  { value: 'cancelled', label: 'Da huy' },
];

function getStatusConfig(status: InvoiceStatus): { label: string; color: string; bgColor: string } {
  switch (status) {
    case 'pending':
      return { label: 'Cho thanh toan', color: Colors.light.warning, bgColor: Colors.light.warning + '20' };
    case 'paid':
      return { label: 'Da thanh toan', color: Colors.light.success, bgColor: Colors.light.success + '20' };
    case 'partially_paid':
      return { label: 'Thanh toan mot phan', color: Colors.light.tint, bgColor: Colors.light.tint + '20' };
    case 'cancelled':
      return { label: 'Da huy', color: Colors.light.error, bgColor: Colors.light.error + '20' };
  }
}

export default function InvoiceListScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');

  const filteredInvoices = MOCK_INVOICES.filter((invoice) => {
    if (statusFilter === 'all') return true;
    return invoice.status === statusFilter;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleInvoicePress = useCallback(
    (invoiceId: string) => {
      router.push(`/billing/${invoiceId}`);
    },
    [router]
  );

  const renderInvoice = ({ item }: { item: InvoiceListItem }) => {
    const statusConfig = getStatusConfig(item.status);

    return (
      <Pressable
        style={styles.invoiceCard}
        onPress={() => handleInvoicePress(item.id)}
      >
        <View style={styles.invoiceHeader}>
          <View>
            <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
            <Text style={styles.invoiceDate}>{formatDate(item.invoiceDate)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.invoiceAmounts}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Tong cong</Text>
            <Text style={styles.amountValue}>{formatVND(item.totalAmount)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Bao hiem chi tra</Text>
            <Text style={[styles.amountValue, styles.insuranceAmount]}>
              -{formatVND(item.insuranceAmount)}
            </Text>
          </View>
          <View style={[styles.amountRow, styles.copayRow]}>
            <Text style={styles.copayLabel}>Benh nhan tra</Text>
            <Text style={styles.copayValue}>{formatVND(item.copayAmount)}</Text>
          </View>
        </View>

        <View style={styles.invoiceFooter}>
          <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Status filter tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.filterTab,
                statusFilter === item.value && styles.filterTabActive,
              ]}
              onPress={() => setStatusFilter(item.value)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  statusFilter === item.value && styles.filterTabTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Invoice list */}
      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoice}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={Colors.light.textSecondary} />
            <Text style={styles.emptyTitle}>Khong co hoa don</Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter === 'all'
                ? 'Chua co hoa don nao cho benh nhan nay'
                : 'Khong co hoa don nao voi trang thai nay'}
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
  filterContainer: {
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  filterTabActive: {
    backgroundColor: Colors.light.tint,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.light.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  invoiceCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  invoiceDate: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceAmounts: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  amountValue: {
    fontSize: 14,
    color: Colors.light.text,
  },
  insuranceAmount: {
    color: Colors.light.success,
  },
  copayRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  copayLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  copayValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  invoiceFooter: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
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
});
