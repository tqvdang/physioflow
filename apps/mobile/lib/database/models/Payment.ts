import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import Invoice from './Invoice';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'insurance';

export default class Payment extends Model {
  static table = 'payments';

  static associations = {
    invoices: { type: 'belongs_to' as const, key: 'invoice_id' },
  };

  @field('remote_id') remoteId!: string;
  @field('invoice_id') invoiceId!: string;
  @field('amount') amount!: number;
  @field('payment_method') paymentMethod!: PaymentMethod;
  @date('payment_date') paymentDate!: Date;
  @field('receipt_number') receiptNumber?: string;
  @field('version') version!: number;
  @field('is_synced') isSynced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt!: Date | null;

  @relation('invoices', 'invoice_id') invoice!: Relation<Invoice>;
}
