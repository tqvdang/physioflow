"use client";

/**
 * React Query hooks for checklist data management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type {
  VisitChecklist,
  ChecklistTemplate,
  ChecklistResponseValue,
  UpdateResponseRequest,
  CompleteChecklistRequest,
  GeneratedNote,
  TimerState,
  QuickScheduleOption,
} from "@/types/checklist";

/**
 * Query keys for checklist data
 */
export const checklistKeys = {
  all: ["checklists"] as const,
  templates: () => [...checklistKeys.all, "templates"] as const,
  template: (id: string) => [...checklistKeys.templates(), id] as const,
  visit: (visitId: string) => [...checklistKeys.all, "visit", visitId] as const,
  active: (checklistId: string) => [...checklistKeys.all, "active", checklistId] as const,
  note: (checklistId: string) => [...checklistKeys.all, "note", checklistId] as const,
};

/**
 * Hook to fetch all checklist templates
 */
export function useChecklistTemplates(enabled = true) {
  return useQuery({
    queryKey: checklistKeys.templates(),
    queryFn: async () => {
      const response = await api.get<ChecklistTemplate[]>("/v1/checklist-templates");
      return response.data;
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes - templates don't change often
  });
}

/**
 * Hook to fetch a single checklist template
 */
export function useChecklistTemplate(templateId: string, enabled = true) {
  return useQuery({
    queryKey: checklistKeys.template(templateId),
    queryFn: async () => {
      const response = await api.get<ChecklistTemplate>(
        `/v1/checklist-templates/${templateId}`
      );
      return response.data;
    },
    enabled: enabled && !!templateId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch visit checklist data
 */
export function useVisitChecklist(visitId: string) {
  return useQuery({
    queryKey: checklistKeys.visit(visitId),
    queryFn: async () => {
      const response = await api.get<VisitChecklist>(`/v1/visits/${visitId}/checklist`);
      return response.data;
    },
    enabled: !!visitId,
    staleTime: 0, // Always fetch fresh data for active checklists
    refetchInterval: false,
  });
}

/**
 * Request to start a new visit checklist
 */
interface StartChecklistRequest {
  visitId: string;
  templateId: string;
  patientId: string;
}

/**
 * Hook to start a new visit checklist
 */
export function useStartVisitChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: StartChecklistRequest) => {
      const response = await api.post<VisitChecklist>(
        `/v1/visits/${request.visitId}/checklist`,
        {
          template_id: request.templateId,
          patient_id: request.patientId,
        }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Set the checklist in cache
      queryClient.setQueryData(checklistKeys.visit(variables.visitId), data);
      queryClient.setQueryData(checklistKeys.active(data.id), data);
    },
  });
}

/**
 * Hook to update a single checklist response with optimistic updates
 */
export function useUpdateChecklistResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateResponseRequest) => {
      const response = await api.patch<VisitChecklist>(
        `/v1/checklists/${request.checklistId}/responses/${request.itemId}`,
        { value: request.value }
      );
      return response.data;
    },
    onMutate: async (request) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: checklistKeys.active(request.checklistId),
      });

      // Snapshot the previous value
      const previousChecklist = queryClient.getQueryData<VisitChecklist>(
        checklistKeys.active(request.checklistId)
      );

      // Optimistically update the checklist
      if (previousChecklist) {
        const updatedChecklist = {
          ...previousChecklist,
          responses: {
            ...previousChecklist.responses,
            [request.itemId]: {
              ...previousChecklist.responses[request.itemId],
              itemId: request.itemId,
              value: request.value,
              completedAt: new Date().toISOString(),
              autoPopulated: false,
            },
          },
        };

        queryClient.setQueryData(
          checklistKeys.active(request.checklistId),
          updatedChecklist
        );
      }

      return { previousChecklist };
    },
    onError: (_err, request, context) => {
      // Rollback on error
      if (context?.previousChecklist) {
        queryClient.setQueryData(
          checklistKeys.active(request.checklistId),
          context.previousChecklist
        );
      }
    },
    onSettled: (_data, _error, request) => {
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: checklistKeys.active(request.checklistId),
      });
    },
  });
}

/**
 * Hook to complete a checklist session
 */
export function useCompleteChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CompleteChecklistRequest) => {
      const response = await api.post<VisitChecklist>(
        `/v1/checklists/${request.checklistId}/complete`,
        { elapsed_seconds: request.elapsedSeconds }
      );
      return response.data;
    },
    onSuccess: (_data, request) => {
      queryClient.invalidateQueries({
        queryKey: checklistKeys.active(request.checklistId),
      });
    },
  });
}

/**
 * Hook to generate/fetch the auto-generated SOAP note
 */
export function useGeneratedNote(checklistId: string) {
  return useQuery({
    queryKey: checklistKeys.note(checklistId),
    queryFn: async () => {
      const response = await api.get<GeneratedNote>(
        `/v1/checklists/${checklistId}/note`
      );
      return response.data;
    },
    enabled: !!checklistId,
  });
}

/**
 * Hook to update and sign the generated note
 */
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      checklistId,
      note,
      sign = false,
    }: {
      checklistId: string;
      note: Partial<GeneratedNote>;
      sign?: boolean;
    }) => {
      const endpoint = sign
        ? `/v1/checklists/${checklistId}/note/sign`
        : `/v1/checklists/${checklistId}/note`;
      const response = await api.patch<GeneratedNote>(endpoint, note);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: checklistKeys.note(variables.checklistId),
      });
    },
  });
}

/**
 * Hook to manage session timer
 */
export function useSessionTimer(
  targetMinutes: number,
  initialSeconds: number = 0,
  autoStart: boolean = true
): TimerState & {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
} {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const targetSeconds = targetMinutes * 60;
  const isOverTarget = elapsedSeconds > targetSeconds;

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused]);

  const start = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const reset = useCallback(() => {
    setElapsedSeconds(0);
    setIsRunning(false);
    setIsPaused(false);
  }, []);

  return {
    elapsedSeconds,
    isRunning,
    isPaused,
    targetSeconds,
    isOverTarget,
    start,
    pause,
    resume,
    reset,
  };
}

/**
 * Hook for quick schedule actions
 */
export function useQuickSchedule(patientId: string) {
  const queryClient = useQueryClient();

  const scheduleOptions: QuickScheduleOption[] = [
    { label: "+3 days", days: 3, type: "quick" },
    { label: "+7 days", days: 7, type: "quick" },
    { label: "Custom", days: 0, type: "custom" },
  ];

  const scheduleMutation = useMutation({
    mutationFn: async ({ days, preferredTime }: { days: number; preferredTime?: string }) => {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + days);

      const response = await api.post(`/v1/patients/${patientId}/appointments`, {
        scheduled_date: scheduledDate.toISOString(),
        preferred_time: preferredTime,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appointments", patientId],
      });
    },
  });

  const scheduleFollowUp = useCallback(
    (days: number, preferredTime?: string) => {
      return scheduleMutation.mutateAsync({ days, preferredTime });
    },
    [scheduleMutation]
  );

  return {
    scheduleOptions,
    scheduleFollowUp,
    isScheduling: scheduleMutation.isPending,
  };
}

/**
 * Hook to calculate checklist progress
 */
export function useChecklistProgress(checklist: VisitChecklist | undefined) {
  if (!checklist) {
    return {
      totalProgress: 0,
      sectionProgress: {},
      completedItems: 0,
      totalItems: 0,
      canComplete: false,
    };
  }

  let completedItems = 0;
  let totalItems = 0;
  let requiredCompleted = 0;
  let requiredTotal = 0;

  const sectionProgress: Record<
    string,
    { completed: number; total: number; percentage: number }
  > = {};

  for (const section of checklist.template.sections) {
    let sectionCompleted = 0;
    const sectionTotal = section.items.length;

    for (const item of section.items) {
      totalItems++;
      const response = checklist.responses[item.id];

      if (item.required) {
        requiredTotal++;
      }

      if (response?.value !== null && response?.value !== undefined) {
        completedItems++;
        sectionCompleted++;
        if (item.required) {
          requiredCompleted++;
        }
      }
    }

    sectionProgress[section.id] = {
      completed: sectionCompleted,
      total: sectionTotal,
      percentage: sectionTotal > 0 ? (sectionCompleted / sectionTotal) * 100 : 0,
    };
  }

  const totalProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const canComplete = requiredCompleted >= requiredTotal;

  return {
    totalProgress,
    sectionProgress,
    completedItems,
    totalItems,
    canComplete,
    requiredCompleted,
    requiredTotal,
  };
}

/**
 * Hook for auto-save functionality with debounce
 */
export function useAutoSave(
  _checklistId: string,
  onSave: (itemId: string, value: ChecklistResponseValue) => void,
  debounceMs: number = 500
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdates = useRef<Map<string, ChecklistResponseValue>>(new Map());

  const queueUpdate = useCallback(
    (itemId: string, value: ChecklistResponseValue) => {
      pendingUpdates.current.set(itemId, value);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        pendingUpdates.current.forEach((val, id) => {
          onSave(id, val);
        });
        pendingUpdates.current.clear();
      }, debounceMs);
    },
    [onSave, debounceMs]
  );

  const flushUpdates = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    pendingUpdates.current.forEach((val, id) => {
      onSave(id, val);
    });
    pendingUpdates.current.clear();
  }, [onSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { queueUpdate, flushUpdates };
}
