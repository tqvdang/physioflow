import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { formatVND } from '@/lib/currency';
import { PaymentForm } from '@/components/billing/PaymentForm';

type InvoiceStatus = 'pending' | 'paid' | 'partially_paid' | 'cancelled';

interface InvoiceItemData {
  id: string;
  serviceCode: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface PaymentData {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  receiptNumber?: string;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  insuranceAmount: number;
  copayAmount: number;
  status: InvoiceStatus;
  patientName: string;
  items: InvoiceItemData[];
  payments: PaymentData[];
}

// Mock data for development
const MOCK_INVOICE: InvoiceData = {
  id: 'inv1',
  invoiceNumber: 'HD-2024-001',
  invoiceDate: '2024-01-10',
  totalAmount: 800000,
  insuranceAmount: 640000,
  copayAmount: 160000,
  status: 'pending',
  patientName: 'Nguyen Van A',
  items: [
    {
      id: 'ii1',
      serviceCode: 'PT001',
      serviceName: 'Tap luyen tri lieu',
      quantity: 2,
      unitPrice: 250000,
      lineTotal: 500000,
    },
    {
      id: 'ii2',
      serviceCode: 'PT002',
      serviceName: 'Lieu phap thu cong',
      quantity: 1,
      unitPrice: 300000,
      lineTotal: 300000,
    },
  ],
  payments: [
    {
      id: 'p1',
      amount: 50000,
      paymentMethod: 'cash',
      paymentDate: '2024-01-10',
      receiptNumber: 'BL-001',
    },
  ],
};

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

function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'cash':
      return 'Tien mat';
    case 'card':
      return 'The';
    case 'transfer':
      return 'Chuyen khoan';
    case 'insurance':
      return 'Bao hiem';
    default:
      return method;
  }
}

export default function InvoiceScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const router = useRouter();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [isOnline] = useState(true); // In real app, use NetInfo

  // In real app, fetch from WatermelonDB by invoiceId
  const invoice = MOCK_INVOICE;
  const statusConfig = getStatusConfig(invoice.status);

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = invoice.copayAmount - totalPaid;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handlePaymentSaved = useCallback(() => {
    setShowPaymentForm(false);
    // In real app, refresh invoice data from DB
  }, []);

  const canRecordPayment = invoice.status !== 'paid' && invoice.status !== 'cancelled';

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.container}>
        {/* Offline indicator */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color={Colors.light.background} />
            <Text style={styles.offlineText}>Ngoai tuyen - Du lieu se dong bo khi co mang</Text>
          </View>
        )}

        {/* Invoice header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
              <Text style={styles.patientName}>{invoice.patientName}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
          <Text style={styles.invoiceDate}>
            Ngay lap: {formatDate(invoice.invoiceDate)}
          </Text>
        </View>

        {/* Service items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dich vu</Text>
          <View style={styles.card}>
            {invoice.items.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.serviceItem,
                  index < invoice.items.length - 1 && styles.serviceItemBorder,
                ]}
              >
                <View style={styles.serviceHeader}>
                  <View style={styles.serviceCodeBadge}>
                    <Text style={styles.serviceCodeText}>{item.serviceCode}</Text>
                  </View>
                  <Text style={styles.lineTotal}>{formatVND(item.lineTotal)}</Text>
                </View>
                <Text style={styles.serviceName}>{item.serviceName}</Text>
                <Text style={styles.serviceDetail}>
                  {item.quantity} x {formatVND(item.unitPrice)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Insurance coverage breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi tiet thanh toan</Text>
          <View style={styles.card}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Tong chi phi dich vu</Text>
              <Text style={styles.breakdownValue}>{formatVND(invoice.totalAmount)}</Text>
            </View>

            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLabelWithIcon}>
                <Ionicons name="shield-checkmark-outline" size={16} color={Colors.light.success} />
                <Text style={[styles.breakdownLabel, styles.insuranceLabel]}>
                  Bao hiem chi tra
                </Text>
              </View>
              <Text style={[styles.breakdownValue, styles.insuranceValue]}>
                -{formatVND(invoice.insuranceAmount)}
              </Text>
            </View>

            <View style={[styles.breakdownRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Benh nhan tra</Text>
              <Text style={styles.totalValue}>{formatVND(invoice.copayAmount)}</Text>
            </View>

            {totalPaid > 0 && (
              <>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Da thanh toan</Text>
                  <Text style={[styles.breakdownValue, styles.paidValue]}>
                    -{formatVND(totalPaid)}
                  </Text>
                </View>
                <View style={[styles.breakdownRow, styles.balanceRow]}>
                  <Text style={styles.balanceLabel}>Con lai</Text>
                  <Text style={styles.balanceValue}>{formatVND(balanceDue)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Payment history */}
        {invoice.payments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lich su thanh toan</Text>
            {invoice.payments.map((payment) => (
              <View key={payment.id} style={styles.paymentCard}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentAmount}>{formatVND(payment.amount)}</Text>
                  <Text style={styles.paymentMethod}>
                    {getPaymentMethodLabel(payment.paymentMethod)}
                  </Text>
                  <Text style={styles.paymentDate}>{formatDate(payment.paymentDate)}</Text>
                </View>
                {payment.receiptNumber && (
                  <View style={styles.receiptBadge}>
                    <Ionicons name="receipt-outline" size={14} color={Colors.light.textSecondary} />
                    <Text style={styles.receiptText}>{payment.receiptNumber}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Record Payment button */}
      {canRecordPayment && (
        <View style={styles.footer}>
          <Pressable
            style={styles.recordPaymentButton}
            onPress={() => setShowPaymentForm(true)}
          >
            <Ionicons name="cash-outline" size={22} color={Colors.light.background} />
            <Text style={styles.recordPaymentText}>Ghi nhan thanh toan</Text>
          </Pressable>
        </View>
      )}

      {/* Payment form modal */}
      <Modal
        visible={showPaymentForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaymentForm(false)}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Ghi nhan thanh toan</Text>
          <Pressable onPress={() => setShowPaymentForm(false)} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.light.text} />
          </Pressable>
        </View>
        <PaymentForm
          invoiceId={invoice.id}
          balanceDue={balanceDue}
          onPaymentSaved={handlePaymentSaved}
          onCancel={() => setShowPaymentForm(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  container: {
    flex: 1,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.warning,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  offlineText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.background,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
  },
  patientName: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceDate: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  serviceItem: {
    paddingVertical: 12,
  },
  serviceItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceCodeBadge: {
    backgroundColor: Colors.light.tint + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  serviceCodeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  lineTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  serviceName: {
    fontSize: 15,
    color: Colors.light.text,
    marginTop: 4,
  },
  serviceDetail: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  breakdownValue: {
    fontSize: 14,
    color: Colors.light.text,
  },
  insuranceLabel: {
    color: Colors.light.success,
  },
  insuranceValue: {
    color: Colors.light.success,
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  paidValue: {
    color: Colors.light.success,
    fontWeight: '500',
  },
  balanceRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  balanceLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.error,
  },
  balanceValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.light.error,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  paymentMethod: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  paymentDate: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  receiptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  receiptText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  recordPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  recordPaymentText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  bottomPadding: {
    height: 40,
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
});
