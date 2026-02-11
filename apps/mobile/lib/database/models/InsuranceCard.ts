import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import Patient from './Patient';

export interface CardValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface CoverageResult {
  insurancePays: number;
  copay: number;
}

export default class InsuranceCard extends Model {
  static table = 'insurance_cards';

  static associations = {
    patients: { type: 'belongs_to' as const, key: 'patient_id' },
  };

  @field('remote_id') remoteId!: string;
  @field('patient_id') patientId!: string;
  @field('bhyt_card_number') bhytCardNumber!: string;
  @field('bhyt_prefix_code') bhytPrefixCode!: string;
  @field('bhyt_coverage_percent') bhytCoveragePercent!: number;
  @field('bhyt_copay_rate') bhytCopayRate!: number;
  @field('hospital_registration_code') hospitalRegistrationCode!: string | null;
  @date('expiration_date') expirationDate!: Date | null;
  @date('valid_from') validFrom!: Date;
  @date('valid_to') validTo!: Date;
  @field('is_verified') isVerified!: boolean;
  @field('version') version!: number;
  @field('is_synced') isSynced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt!: Date | null;

  @relation('patients', 'patient_id') patient!: Relation<Patient>;

  validateCard(): CardValidationResult {
    const errors: string[] = [];

    // BHYT card format: XX9-9999-99999-99999
    const regex = /^[A-Z]{2}\d-\d{4}-\d{5}-\d{5}$/;
    if (!regex.test(this.bhytCardNumber)) {
      errors.push('Invalid card format. Expected: XX9-9999-99999-99999');
    }

    // Prefix code validation (2 uppercase letters)
    if (!/^[A-Z]{2}$/.test(this.bhytPrefixCode)) {
      errors.push('Invalid prefix code. Expected 2 uppercase letters');
    }

    // Coverage percent range
    if (this.bhytCoveragePercent < 0 || this.bhytCoveragePercent > 100) {
      errors.push('Coverage percent must be between 0 and 100');
    }

    // Copay rate range
    if (this.bhytCopayRate < 0 || this.bhytCopayRate > 100) {
      errors.push('Copay rate must be between 0 and 100');
    }

    // Expiration check (check both expiration_date and valid_to)
    const now = new Date();
    if (this.expirationDate && this.expirationDate < now) {
      errors.push('Card has expired (expiration date passed)');
    }
    if (this.validTo < now) {
      errors.push('Card has expired');
    }

    // Hospital registration code validation (must be 5 chars if present)
    if (this.hospitalRegistrationCode && this.hospitalRegistrationCode.length !== 5) {
      errors.push('Hospital registration code must be exactly 5 characters');
    }

    // Valid date range
    if (this.validFrom >= this.validTo) {
      errors.push('Valid from date must be before valid to date');
    }

    return { isValid: errors.length === 0, errors };
  }

  calculateCoverage(totalAmount: number): CoverageResult {
    const insurancePays = totalAmount * (this.bhytCoveragePercent / 100);
    const copay = totalAmount - insurancePays;
    return { insurancePays, copay };
  }
}
