import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation, children } from '@nozbe/watermelondb/decorators';
import Patient from './Patient';

export type InvoiceStatus = 'pending' | 'paid' | 'partially_paid' | 'cancelled';

export default class Invoice extends Model {
  static table = 'invoices';

  static associations = {
    patients: { type: 'belongs_to' as const, key: 'patient_id' },
    invoice_items: { type: 'has_many' as const, foreignKey: 'invoice_id' },
    payments: { type: 'has_many' as const, foreignKey: 'invoice_id' },
  };

  @field('remote_id') remoteId!: string;
  @field('patient_id') patientId!: string;
  @field('invoice_number') invoiceNumber!: string;
  @field('total_amount') totalAmount!: number;
  @field('insurance_amount') insuranceAmount!: number;
  @field('copay_amount') copayAmount!: number;
  @field('status') status!: InvoiceStatus;
  @date('invoice_date') invoiceDate!: Date;
  @field('version') version!: number;
  @field('is_synced') isSynced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt!: Date | null;

  @relation('patients', 'patient_id') patient!: Relation<Patient>;
  @children('invoice_items') invoiceItems: any;
  @children('payments') payments: any;

  get balanceDue(): number {
    return this.copayAmount;
  }
}
