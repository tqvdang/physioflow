import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import Invoice from './Invoice';

export default class InvoiceItem extends Model {
  static table = 'invoice_items';

  static associations = {
    invoices: { type: 'belongs_to' as const, key: 'invoice_id' },
  };

  @field('remote_id') remoteId!: string;
  @field('invoice_id') invoiceId!: string;
  @field('service_code') serviceCode!: string;
  @field('service_name') serviceName!: string;
  @field('quantity') quantity!: number;
  @field('unit_price') unitPrice!: number;
  @field('line_total') lineTotal!: number;
  @field('is_synced') isSynced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('invoices', 'invoice_id') invoice!: Relation<Invoice>;
}
