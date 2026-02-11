/**
 * Re-export all React Query hooks for PhysioFlow
 */

// Patient hooks
export {
  patientKeys,
  usePatients,
  usePatient,
  usePatientDashboard,
  usePatientStats,
  usePatientSessions,
  usePatientTimeline,
  usePatientSearch,
  useCreatePatient,
  useUpdatePatient,
  useDeletePatient,
  isApiError as isPatientApiError,
} from "./use-patients";

// Appointment hooks
export {
  appointmentKeys,
  therapistKeys,
  useAppointments,
  useAppointment,
  useTodayAppointments,
  useDaySchedule,
  useAppointmentsByDateRange,
  usePatientAppointments,
  useTherapists,
  useTherapistAvailability,
  useCreateAppointment,
  useUpdateAppointment,
  useCancelAppointment,
  useDeleteAppointment,
  isApiError as isAppointmentApiError,
} from "./use-appointments";

// Exercise hooks
export {
  exerciseKeys,
  useExercises,
  useExercise,
  useExerciseSearch,
  useCreateExercise,
  useUpdateExercise,
  useDeleteExercise,
  usePatientPrescriptions,
  usePrescribeExercise,
  useUpdatePrescription,
  useDeletePrescription,
  usePatientComplianceSummary,
  useLogCompliance,
  usePrescriptionLogs,
  useExerciseHandout,
  isApiError as isExerciseApiError,
} from "./use-exercises";

// Checklist hooks
export {
  checklistKeys,
  useChecklistTemplates,
  useChecklistTemplate,
  useVisitChecklist,
  useStartVisitChecklist,
  useUpdateChecklistResponse,
  useCompleteChecklist,
  useGeneratedNote,
  useUpdateNote,
  useSessionTimer,
  useQuickSchedule,
  useChecklistProgress,
  useAutoSave,
} from "./use-checklists";

// Outcome measure hooks
export {
  outcomeMeasureKeys,
  MEASURE_LIBRARY,
  getMeasureDefinition,
  useMeasureLibrary,
  usePatientMeasures,
  useRecordMeasure,
  useProgress,
  useTrending,
} from "./use-outcome-measures";

export type {
  MeasureType,
  MeasurePhase,
  MeasureDefinition,
  OutcomeMeasurement,
  RecordMeasureRequest,
  ProgressDataPoint,
  ProgressSummary,
  TrendingRow,
} from "./use-outcome-measures";

// Billing hooks
export {
  billingKeys,
  useServiceCodes,
  useInvoices,
  usePatientInvoices,
  useInvoice,
  useCreateInvoice,
  useCalculateBilling,
  usePaymentHistory,
  useRecordPayment,
  isBillingApiError,
} from "./use-billing";

// Protocol hooks
export {
  protocolKeys,
  useProtocols,
  useProtocol,
  usePatientProtocols,
  useAssignProtocol,
  useUpdateProgress,
} from "./use-protocols";

// Discharge hooks
export {
  dischargeKeys,
  useDischargePlan,
  useCreateDischargePlan,
  useGenerateSummary,
  useDischargeSummary,
  usePatientDischargeSummary,
  useCompleteDischarge,
} from "./use-discharge";

// ROM assessment hooks
export {
  romKeys,
  usePatientROM,
  useCreateROM,
  useROMTrending,
} from "./use-rom";

export type {
  ROMJoint,
  ROMSide,
  ROMMovementType,
  ROMAssessment,
  ROMTrendingData,
  CreateROMRequest,
} from "./use-rom";

// MMT assessment hooks
export {
  mmtKeys,
  usePatientMMT,
  useCreateMMT,
  useMMTTrending,
} from "./use-mmt";

export type {
  MMTSide,
  MMTAssessment,
  MMTTrendingData,
  CreateMMTRequest,
} from "./use-mmt";

// BHYT Claim submission hooks
export {
  bhytClaimKeys,
  useBHYTClaims,
  useBHYTClaim,
  useGenerateClaim,
  useDownloadClaim,
  isBHYTClaimApiError,
} from "./use-bhyt-claims";

export type {
  BHYTClaim,
  BHYTClaimLineItem,
  BHYTClaimStatus,
  BHYTClaimSearchParams,
  GenerateClaimRequest,
  ClaimListResponse,
} from "./use-bhyt-claims";

// Common type guard for API errors
export { ApiError } from "@/lib/api";
