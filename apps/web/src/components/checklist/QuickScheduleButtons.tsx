"use client";

import * as React from "react";
import { useState } from "react";
import { Calendar, Plus, Check, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QuickScheduleButtonsProps {
  onSchedule: (days: number, preferredTime?: string) => Promise<void>;
  isScheduling?: boolean;
  scheduledDate?: Date | null;
}

interface QuickOption {
  label: string;
  days: number;
}

const QUICK_OPTIONS: QuickOption[] = [
  { label: "+3 days", days: 3 },
  { label: "+7 days", days: 7 },
  { label: "+14 days", days: 14 },
];

/**
 * Quick schedule buttons for follow-up appointments
 */
export function QuickScheduleButtons({
  onSchedule,
  isScheduling = false,
  scheduledDate,
}: QuickScheduleButtonsProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customDays, setCustomDays] = useState(7);
  const [customTime, setCustomTime] = useState("09:00");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const handleQuickSchedule = async (days: number) => {
    setSelectedOption(days);
    try {
      await onSchedule(days);
    } finally {
      setSelectedOption(null);
    }
  };

  const handleCustomSchedule = async () => {
    try {
      await onSchedule(customDays, customTime);
      setIsCustomOpen(false);
    } catch (error) {
      console.error("Failed to schedule:", error);
    }
  };

  // If already scheduled, show confirmation
  if (scheduledDate) {
    return (
      <div className="p-4 rounded-lg bg-success-50 border border-success-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center">
            <Check className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-medium text-success-700">
              Follow-up Scheduled
            </div>
            <div className="text-sm text-success-600">
              {format(scheduledDate, "EEEE, d MMMM yyyy", { locale: vi })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span>Schedule Follow-up</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Quick options */}
        {QUICK_OPTIONS.map((option) => {
          const targetDate = addDays(new Date(), option.days);
          const isLoading = isScheduling && selectedOption === option.days;

          return (
            <Button
              key={option.days}
              type="button"
              variant="outline"
              onClick={() => handleQuickSchedule(option.days)}
              disabled={isScheduling}
              className={cn(
                "flex-1 min-w-[100px] h-auto py-3 flex flex-col gap-1",
                "active:scale-[0.98] touch-manipulation"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="font-semibold">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(targetDate, "EEE, d/M", { locale: vi })}
                  </span>
                </>
              )}
            </Button>
          );
        })}

        {/* Custom option */}
        <Dialog open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={isScheduling}
              className="h-auto py-3 px-4 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Custom
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Custom Follow-up</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Days from now */}
              <div className="space-y-2">
                <Label>Days from now</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={customDays}
                    onChange={(e) => setCustomDays(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">days</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(addDays(new Date(), customDays), "EEEE, d MMMM yyyy", {
                    locale: vi,
                  })}
                </p>
              </div>

              {/* Preferred time */}
              <div className="space-y-2">
                <Label>Preferred Time</Label>
                <Input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-32"
                />
              </div>

              {/* Quick day shortcuts */}
              <div className="space-y-2">
                <Label>Quick select</Label>
                <div className="flex flex-wrap gap-2">
                  {[7, 14, 21, 28, 30, 60, 90].map((days) => (
                    <Button
                      key={days}
                      type="button"
                      variant={customDays === days ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCustomDays(days)}
                    >
                      {days} days
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCustomOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCustomSchedule}
                disabled={isScheduling}
              >
                {isScheduling ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Calendar className="w-4 h-4 mr-2" />
                )}
                Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
