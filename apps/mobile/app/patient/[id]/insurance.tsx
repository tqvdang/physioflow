import { useLocalSearchParams, useRouter } from 'expo-router';
import { InsuranceScreen } from '@/src/screens/patient/InsuranceScreen';

export default function PatientInsurancePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const patientId = id ?? '';

  return (
    <InsuranceScreen
      patientId={patientId}
      patientName="" // Loaded from DB inside the screen
      onNavigateToForm={(card) => {
        if (card) {
          router.push({
            pathname: '/patient/[id]/insurance-form',
            params: { id, cardId: card.id },
          });
        } else {
          router.push({
            pathname: '/patient/[id]/insurance-form',
            params: { id },
          });
        }
      }}
    />
  );
}
