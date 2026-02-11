import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { database, InsuranceCard } from '@/lib/database';
import { InsuranceFormScreen } from '@/src/screens/patient/InsuranceFormScreen';

export default function InsuranceFormPage() {
  const { id, cardId } = useLocalSearchParams<{ id: string; cardId?: string }>();
  const router = useRouter();
  const patientId = id ?? '';
  const [existingCard, setExistingCard] = useState<InsuranceCard | undefined>(
    undefined
  );
  const [isReady, setIsReady] = useState(!cardId);

  useEffect(() => {
    if (!cardId) return;

    const loadCard = async () => {
      try {
        const card = await database
          .get<InsuranceCard>('insurance_cards')
          .find(cardId);
        setExistingCard(card);
      } catch (error) {
        console.error('Failed to load insurance card:', error);
      } finally {
        setIsReady(true);
      }
    };

    loadCard();
  }, [cardId]);

  if (!isReady) return null;

  return (
    <InsuranceFormScreen
      patientId={patientId}
      existingCard={existingCard}
      onSave={() => router.back()}
      onCancel={() => router.back()}
    />
  );
}
