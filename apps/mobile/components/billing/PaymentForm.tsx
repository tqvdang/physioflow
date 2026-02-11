import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { formatVND, parseVND } from '@/lib/currency';
import { database, Payment } from '@/lib/database';
import { queuePaymentForSync } from '@/lib/services/sync/billingSync';

type IoniconsName = keyof typeof Ionicons.glyphMap;

export type PaymentMethodType = 'cash' | 'card' | 'transfer' | 'insurance';

interface PaymentMethodOption {
  value: PaymentMethodType;
  label: string;
  icon: IoniconsName;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  { value: 'cash', label: 'Tien mat', icon: 'cash-outline' },
  { value: 'card', label: 'The', icon: 'card-outline' },
  { value: 'transfer', label: 'Chuyen khoan', icon: 'swap-horizontal-outline' },
  { value: 'insurance', label: 'Bao hiem', icon: 'shield-checkmark-outline' },
];

interface PaymentFormProps {
  invoiceId: string;
  balanceDue: number;
  onPaymentSaved: () => void;
  onCancel: () => void;
}

export function PaymentForm({
  invoiceId,
  balanceDue,
  onPaymentSaved,
  onCancel,
}: PaymentFormProps) {
  const [amountText, setAmountText] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const parsedAmount = parseVND(amountText);

  const handleAmountChange = useCallback((text: string) => {
    // Only allow digits
    const digitsOnly = text.replace(/[^\d]/g, '');
    setAmountText(digitsOnly);
  }, []);

  const validate = (): string | null => {
    if (parsedAmount <= 0) {
      return 'Vui long nhap so tien thanh toan';
    }
    if (parsedAmount > balanceDue) {
      return `So tien khong the vuot qua ${formatVND(balanceDue)}`;
    }
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Loi', error);
      return;
    }

    setIsSaving(true);

    try {
      let paymentId = '';

      await database.write(async () => {
        const payment = await database.get<Payment>('payments').create((p) => {
          p.remoteId = '';
          p.invoiceId = invoiceId;
          p.amount = parsedAmount;
          p.paymentMethod = paymentMethod;
          p.paymentDate = new Date();
          p.receiptNumber = receiptNumber || undefined;
          p.version = 1;
          p.isSynced = false;
        });
        paymentId = payment.id;
      });

      // Queue for background sync
      await queuePaymentForSync(paymentId, {
        invoiceId,
        amount: parsedAmount,
        paymentMethod,
        paymentDate: new Date().toISOString(),
        receiptNumber: receiptNumber || undefined,
      });

      onPaymentSaved();
    } catch (err) {
      Alert.alert('Loi', 'Khong the luu thanh toan. Vui long thu lai.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Balance due */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>So tien can thanh toan</Text>
        <Text style={styles.balanceAmount}>{formatVND(balanceDue)}</Text>
      </View>

      {/* Amount input */}
      <View style={styles.section}>
        <Text style={styles.label}>So tien</Text>
        <View style={styles.amountInputContainer}>
          <TextInput
            style={styles.amountInput}
            value={amountText}
            onChangeText={handleAmountChange}
            placeholder="0"
            placeholderTextColor={Colors.light.textSecondary}
            keyboardType="numeric"
            returnKeyType="done"
          />
          <Text style={styles.currencySymbol}>VND</Text>
        </View>
        {amountText.length > 0 && (
          <Text style={styles.amountPreview}>{formatVND(parsedAmount)}</Text>
        )}
      </View>

      {/* Payment method */}
      <View style={styles.section}>
        <Text style={styles.label}>Phuong thuc thanh toan</Text>
        <View style={styles.methodGrid}>
          {PAYMENT_METHODS.map((method) => (
            <Pressable
              key={method.value}
              style={[
                styles.methodButton,
                paymentMethod === method.value && styles.methodButtonSelected,
              ]}
              onPress={() => setPaymentMethod(method.value)}
            >
              <Ionicons
                name={method.icon}
                size={24}
                color={
                  paymentMethod === method.value
                    ? Colors.light.tint
                    : Colors.light.textSecondary
                }
              />
              <Text
                style={[
                  styles.methodLabel,
                  paymentMethod === method.value && styles.methodLabelSelected,
                ]}
              >
                {method.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Receipt number */}
      <View style={styles.section}>
        <Text style={styles.label}>So bien lai (khong bat buoc)</Text>
        <TextInput
          style={styles.textInput}
          value={receiptNumber}
          onChangeText={setReceiptNumber}
          placeholder="VD: BL-2024-001"
          placeholderTextColor={Colors.light.textSecondary}
          returnKeyType="done"
        />
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.saveButton, isSaving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Ionicons name="checkmark-circle" size={22} color={Colors.light.background} />
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Dang luu...' : 'Luu thanh toan'}
          </Text>
        </Pressable>
        <Pressable style={styles.cancelButton} onPress={onCancel} disabled={isSaving}>
          <Text style={styles.cancelButtonText}>Huy</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  balanceCard: {
    backgroundColor: Colors.light.tint,
    padding: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.light.background,
    opacity: 0.8,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.background,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 16,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.text,
    paddingVertical: 16,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  amountPreview: {
    fontSize: 14,
    color: Colors.light.tint,
    marginTop: 4,
    fontWeight: '500',
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  methodButton: {
    width: '47%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 8,
  },
  methodButtonSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tint + '08',
  },
  methodLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  methodLabelSelected: {
    color: Colors.light.tint,
  },
  textInput: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.light.text,
  },
  actions: {
    padding: 16,
    marginTop: 24,
    gap: 12,
    marginBottom: 40,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.success,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
});
