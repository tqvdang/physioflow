import { database, Invoice, InvoiceItem, Payment } from '@/lib/database';
import { Q } from '@nozbe/watermelondb';
import { api } from '@/lib/api';
import { isOnline, queueForSync } from '@/lib/offline';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Pull invoices for a specific patient from the server and upsert locally.
 */
export async function syncInvoices(patientId: string): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

  const online = await isOnline();
  if (!online) {
    return { success: false, synced: 0, failed: 0, errors: ['No internet connection'] };
  }

  try {
    const invoices = await api.get<any[]>(`/patients/${patientId}/invoices`);

    await database.write(async () => {
      for (const invoice of invoices) {
        const existing = await database
          .get<Invoice>('invoices')
          .query(Q.where('remote_id', invoice.id))
          .fetch();

        if (existing.length === 0) {
          await database.get<Invoice>('invoices').create((inv) => {
            inv.remoteId = invoice.id;
            inv.patientId = patientId;
            inv.invoiceNumber = invoice.invoiceNumber;
            inv.totalAmount = invoice.totalAmount;
            inv.insuranceAmount = invoice.insuranceAmount;
            inv.copayAmount = invoice.copayAmount;
            inv.status = invoice.status;
            inv.invoiceDate = new Date(invoice.invoiceDate);
            inv.version = invoice.version ?? 1;
            inv.isSynced = true;
            inv.syncedAt = new Date();
          });
        } else {
          const local = existing[0];
          if ((invoice.version ?? 1) > local.version) {
            await local.update((inv) => {
              inv.invoiceNumber = invoice.invoiceNumber;
              inv.totalAmount = invoice.totalAmount;
              inv.insuranceAmount = invoice.insuranceAmount;
              inv.copayAmount = invoice.copayAmount;
              inv.status = invoice.status;
              inv.invoiceDate = new Date(invoice.invoiceDate);
              inv.version = invoice.version ?? 1;
              inv.isSynced = true;
              inv.syncedAt = new Date();
            });
          }
        }

        // Sync invoice items
        if (invoice.items && Array.isArray(invoice.items)) {
          for (const item of invoice.items) {
            const existingItems = await database
              .get<InvoiceItem>('invoice_items')
              .query(Q.where('remote_id', item.id))
              .fetch();

            if (existingItems.length === 0) {
              const localInvoice = await database
                .get<Invoice>('invoices')
                .query(Q.where('remote_id', invoice.id))
                .fetch();

              if (localInvoice.length > 0) {
                await database.get<InvoiceItem>('invoice_items').create((ii) => {
                  ii.remoteId = item.id;
                  ii.invoiceId = localInvoice[0].id;
                  ii.serviceCode = item.serviceCode;
                  ii.serviceName = item.serviceName;
                  ii.quantity = item.quantity;
                  ii.unitPrice = item.unitPrice;
                  ii.lineTotal = item.lineTotal;
                  ii.isSynced = true;
                });
              }
            }
          }
        }

        result.synced++;
      }
    });
  } catch (error) {
    result.success = false;
    result.failed++;
    result.errors.push(error instanceof Error ? error.message : 'Failed to sync invoices');
  }

  return result;
}

/**
 * Sync payments for a specific patient from the server, with retry logic.
 */
export async function syncPayments(patientId: string): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

  const online = await isOnline();
  if (!online) {
    return { success: false, synced: 0, failed: 0, errors: ['No internet connection'] };
  }

  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const payments = await api.get<any[]>(`/patients/${patientId}/payments`);

      await database.write(async () => {
        for (const payment of payments) {
          const existing = await database
            .get<Payment>('payments')
            .query(Q.where('remote_id', payment.id))
            .fetch();

          if (existing.length === 0) {
            // Find the local invoice ID by remote ID
            const localInvoice = await database
              .get<Invoice>('invoices')
              .query(Q.where('remote_id', payment.invoiceId))
              .fetch();

            if (localInvoice.length > 0) {
              await database.get<Payment>('payments').create((p) => {
                p.remoteId = payment.id;
                p.invoiceId = localInvoice[0].id;
                p.amount = payment.amount;
                p.paymentMethod = payment.paymentMethod;
                p.paymentDate = new Date(payment.paymentDate);
                p.receiptNumber = payment.receiptNumber;
                p.version = payment.version ?? 1;
                p.isSynced = true;
                p.syncedAt = new Date();
              });
              result.synced++;
            }
          } else {
            const local = existing[0];
            if ((payment.version ?? 1) > local.version) {
              await local.update((p) => {
                p.amount = payment.amount;
                p.paymentMethod = payment.paymentMethod;
                p.paymentDate = new Date(payment.paymentDate);
                p.receiptNumber = payment.receiptNumber;
                p.version = payment.version ?? 1;
                p.isSynced = true;
                p.syncedAt = new Date();
              });
              result.synced++;
            }
          }
        }
      });

      // Success -- exit retry loop
      return result;
    } catch (error) {
      attempt++;
      if (attempt >= MAX_RETRIES) {
        result.success = false;
        result.failed++;
        result.errors.push(
          error instanceof Error ? error.message : 'Failed to sync payments after retries'
        );
      } else {
        await delay(RETRY_DELAY_MS * attempt);
      }
    }
  }

  return result;
}

/**
 * Queue a locally-created payment to be synced when online.
 */
export async function queuePaymentForSync(
  paymentId: string,
  payload: {
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    receiptNumber?: string;
  }
): Promise<void> {
  await queueForSync('payment', paymentId, 'create', payload);
}
