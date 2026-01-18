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

// Common type guard for API errors
export { ApiError } from "@/lib/api";
