"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCreateMMT } from "@/hooks/use-mmt";
import type { MMTSide } from "@/hooks/use-mmt";

const SIDES: { value: MMTSide; labelKey: string }[] = [
  { value: "left", labelKey: "left" },
  { value: "right", labelKey: "right" },
  { value: "bilateral", labelKey: "bilateral" },
];

// Grade descriptions for the selector
const GRADES = [
  { value: 0, label: "0 - Zero", labelKey: "grade0" },
  { value: 1, label: "1 - Trace", labelKey: "grade1" },
  { value: 1.5, label: "1+ / 2-", labelKey: "grade1plus" },
  { value: 2, label: "2 - Poor", labelKey: "grade2" },
  { value: 2.5, label: "2+ / 3-", labelKey: "grade2plus" },
  { value: 3, label: "3 - Fair", labelKey: "grade3" },
  { value: 3.5, label: "3+ / 4-", labelKey: "grade3plus" },
  { value: 4, label: "4 - Good", labelKey: "grade4" },
  { value: 4.5, label: "4+ / 5-", labelKey: "grade4plus" },
  { value: 5, label: "5 - Normal", labelKey: "grade5" },
];

// Muscle groups organized by region
interface MuscleGroupDef {
  name: string;
  labelKey: string;
}

const MUSCLE_GROUPS_BY_REGION: Record<string, MuscleGroupDef[]> = {
  shoulder: [
    { name: "Deltoid", labelKey: "deltoid" },
    { name: "Rotator Cuff", labelKey: "rotatorCuff" },
  ],
  arm: [
    { name: "Biceps", labelKey: "biceps" },
    { name: "Triceps", labelKey: "triceps" },
  ],
  forearm: [
    { name: "Wrist Extensors", labelKey: "wristExtensors" },
    { name: "Wrist Flexors", labelKey: "wristFlexors" },
  ],
  hand: [
    { name: "Grip", labelKey: "grip" },
  ],
  chest: [
    { name: "Pectoralis Major", labelKey: "pectoralisMajor" },
  ],
  back: [
    { name: "Latissimus Dorsi", labelKey: "latissimusDorsi" },
    { name: "Rhomboids", labelKey: "rhomboids" },
    { name: "Erector Spinae", labelKey: "erectorSpinae" },
  ],
  neck: [
    { name: "Trapezius", labelKey: "trapezius" },
  ],
  hip: [
    { name: "Hip Flexors", labelKey: "hipFlexors" },
    { name: "Hip Extensors", labelKey: "hipExtensors" },
    { name: "Hip Abductors", labelKey: "hipAbductors" },
    { name: "Hip Adductors", labelKey: "hipAdductors" },
    { name: "Gluteus Maximus", labelKey: "gluteusMaximus" },
    { name: "Gluteus Medius", labelKey: "gluteusMedius" },
  ],
  thigh: [
    { name: "Quadriceps", labelKey: "quadriceps" },
    { name: "Hamstrings", labelKey: "hamstrings" },
  ],
  calf: [
    { name: "Gastrocnemius", labelKey: "gastrocnemius" },
    { name: "Tibialis Anterior", labelKey: "tibialisAnterior" },
  ],
  core: [
    { name: "Abdominals", labelKey: "abdominals" },
  ],
};

interface MMTFormProps {
  patientId: string;
  visitId?: string;
  onSuccess?: () => void;
}

export function MMTForm({ patientId, visitId, onSuccess }: MMTFormProps) {
  const t = useTranslations("assessment.mmt");
  const createMMT = useCreateMMT();

  const [muscleGroup, setMuscleGroup] = useState("");
  const [side, setSide] = useState<MMTSide | "">("");
  const [grade, setGrade] = useState<string>("");
  const [notes, setNotes] = useState("");

  const gradeNum = parseFloat(grade);
  const isValidGrade = !isNaN(gradeNum) && gradeNum >= 0 && gradeNum <= 5;
  const canSubmit = muscleGroup && side && isValidGrade;

  // Get the grade description for the selected grade
  const selectedGrade = GRADES.find((g) => g.value === gradeNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      await createMMT.mutateAsync({
        patientId,
        visitId,
        muscleGroup,
        side: side as MMTSide,
        grade: gradeNum,
        notes: notes || undefined,
      });

      // Reset form
      setMuscleGroup("");
      setSide("");
      setGrade("");
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
            {/* Muscle group selector */}
            <div className="space-y-2">
              <Label>{t("muscleGroup")}</Label>
              <Select
                value={muscleGroup}
                onValueChange={setMuscleGroup}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectMuscleGroup")} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MUSCLE_GROUPS_BY_REGION).map(
                    ([region, groups]) => (
                      <div key={region}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                          {t(`regions.${region}`)}
                        </div>
                        {groups.map((mg) => (
                          <SelectItem key={mg.name} value={mg.name}>
                            {t(`muscles.${mg.labelKey}`)}
                          </SelectItem>
                        ))}
                      </div>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Side selector */}
            <div className="space-y-2">
              <Label>{t("side")}</Label>
              <Select
                value={side}
                onValueChange={(val) => setSide(val as MMTSide)}
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

            {/* Grade selector */}
            <div className="space-y-2">
              <Label>{t("grade")}</Label>
              <Select
                value={grade}
                onValueChange={setGrade}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectGrade")} />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => (
                    <SelectItem key={g.value} value={String(g.value)}>
                      {t(`grades.${g.labelKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedGrade && (
                <Badge variant="outline" className="text-xs">
                  {t(`gradeDescriptions.${selectedGrade.labelKey}`)}
                </Badge>
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
              disabled={!canSubmit || createMMT.isPending}
            >
              {createMMT.isPending ? t("recording") : t("record")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
