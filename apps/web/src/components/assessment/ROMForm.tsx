"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateROM } from "@/hooks/use-rom";
import type { ROMJoint, ROMSide, ROMMovementType } from "@/hooks/use-rom";
import {
  ROM_JOINT_MAX_DEGREES,
  ROM_NORMAL_RANGES,
  type ROMJointKey,
} from "@/lib/validations";

const JOINTS: { value: ROMJoint; labelKey: string }[] = [
  { value: "shoulder", labelKey: "shoulder" },
  { value: "elbow", labelKey: "elbow" },
  { value: "wrist", labelKey: "wrist" },
  { value: "hip", labelKey: "hip" },
  { value: "knee", labelKey: "knee" },
  { value: "ankle", labelKey: "ankle" },
  { value: "cervical_spine", labelKey: "cervicalSpine" },
  { value: "thoracic_spine", labelKey: "thoracicSpine" },
  { value: "lumbar_spine", labelKey: "lumbarSpine" },
];

const SIDES: { value: ROMSide; labelKey: string }[] = [
  { value: "left", labelKey: "left" },
  { value: "right", labelKey: "right" },
  { value: "bilateral", labelKey: "bilateral" },
];

const MOVEMENT_TYPES: { value: ROMMovementType; labelKey: string }[] = [
  { value: "active", labelKey: "active" },
  { value: "passive", labelKey: "passive" },
];

// Use centralized validation constants (ROM_NORMAL_RANGES, ROM_JOINT_MAX_DEGREES)
// imported from @/lib/validations

interface ROMFormProps {
  patientId: string;
  visitId?: string;
  onSuccess?: () => void;
}

export function ROMForm({ patientId, visitId, onSuccess }: ROMFormProps) {
  const t = useTranslations("assessment.rom");
  const tCommon = useTranslations("common");
  const createROM = useCreateROM();

  const [joint, setJoint] = useState<ROMJoint | "">("");
  const [side, setSide] = useState<ROMSide | "">("");
  const [movementType, setMovementType] = useState<ROMMovementType | "">("");
  const [degree, setDegree] = useState<string>("");
  const [notes, setNotes] = useState("");

  const normalRange = joint ? ROM_NORMAL_RANGES[joint as ROMJointKey] : null;
  const maxDegree = joint
    ? ROM_JOINT_MAX_DEGREES[joint as ROMJointKey] ?? 360
    : 360;
  const degreeNum = parseFloat(degree);
  const isValidDegree =
    !isNaN(degreeNum) && degreeNum >= 0 && degreeNum <= maxDegree;
  const canSubmit = joint && side && movementType && isValidDegree;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      await createROM.mutateAsync({
        patientId,
        visitId,
        joint: joint as ROMJoint,
        side: side as ROMSide,
        movementType: movementType as ROMMovementType,
        degree: degreeNum,
        notes: notes || undefined,
      });

      // Reset form
      setJoint("");
      setSide("");
      setMovementType("");
      setDegree("");
      setNotes("");
      onSuccess?.();
    } catch {
      // Error handled by React Query
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Joint selector */}
            <div className="space-y-2">
              <Label>{t("joint")}</Label>
              <Select
                value={joint}
                onValueChange={(val) => setJoint(val as ROMJoint)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectJoint")} />
                </SelectTrigger>
                <SelectContent>
                  {JOINTS.map((j) => (
                    <SelectItem key={j.value} value={j.value}>
                      {t(`joints.${j.labelKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Side selector */}
            <div className="space-y-2">
              <Label>{t("side")}</Label>
              <Select
                value={side}
                onValueChange={(val) => setSide(val as ROMSide)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectSide")} />
                </SelectTrigger>
                <SelectContent>
                  {SIDES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {t(`sides.${s.labelKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Movement type selector */}
            <div className="space-y-2">
              <Label>{t("movementType")}</Label>
              <Select
                value={movementType}
                onValueChange={(val) => setMovementType(val as ROMMovementType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectMovementType")} />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.map((mt) => (
                    <SelectItem key={mt.value} value={mt.value}>
                      {t(`movementTypes.${mt.labelKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Degree input */}
          <div className="space-y-2">
            <Label>{t("degree")}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={maxDegree}
                step={0.5}
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="0"
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                {t("degrees")}
              </span>
              {normalRange !== null && (
                <span className="text-sm text-muted-foreground ml-2">
                  ({t("normalRange")}: 0-{normalRange}, max: {maxDegree})
                </span>
              )}
              {degree && !isValidDegree && (
                <span className="text-sm text-destructive ml-2">
                  0-{maxDegree}
                </span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t("notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!canSubmit || createROM.isPending}
            >
              {createROM.isPending ? t("recording") : t("record")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
