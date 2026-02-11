"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePatientROM } from "@/hooks/use-rom";
import { usePatientMMT } from "@/hooks/use-mmt";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface ROMMMTHistoryProps {
  patientId: string;
}

function TrendArrow({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return null;
  const diff = current - previous;
  if (diff > 0) {
    return <ArrowUp className="h-4 w-4 text-green-600 inline-block" />;
  } else if (diff < 0) {
    return <ArrowDown className="h-4 w-4 text-red-600 inline-block" />;
  }
  return <Minus className="h-4 w-4 text-gray-400 inline-block" />;
}

export function ROMMMTHistory({ patientId }: ROMMMTHistoryProps) {
  const t = useTranslations("assessment");
  const romQuery = usePatientROM(patientId);
  const mmtQuery = usePatientMMT(patientId);

  const romData = romQuery.data || [];
  const mmtData = mmtQuery.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("history.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rom">
          <TabsList>
            <TabsTrigger value="rom">
              {t("rom.title")} ({romData.length})
            </TabsTrigger>
            <TabsTrigger value="mmt">
              {t("mmt.title")} ({mmtData.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rom" className="mt-4">
            {romQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">{t("loading")}</p>
            ) : romData.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("rom.noData")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">{t("rom.joint")}</th>
                      <th className="text-left py-2 px-2">{t("rom.side")}</th>
                      <th className="text-left py-2 px-2">{t("rom.movementType")}</th>
                      <th className="text-right py-2 px-2">{t("rom.degree")}</th>
                      <th className="text-left py-2 px-2">{t("history.trend")}</th>
                      <th className="text-left py-2 px-2">{t("history.date")}</th>
                      <th className="text-left py-2 px-2">{t("rom.notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {romData.map((assessment, index) => {
                      // Find previous assessment for the same joint/side/movement
                      const previous = romData.find(
                        (a, i) =>
                          i > index &&
                          a.joint === assessment.joint &&
                          a.side === assessment.side &&
                          a.movementType === assessment.movementType
                      );
                      return (
                        <tr key={assessment.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-2">
                            <Badge variant="outline">
                              {t(`rom.joints.${assessment.joint.replace(/_/g, "")}`)}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 capitalize">{assessment.side}</td>
                          <td className="py-2 px-2 capitalize">{assessment.movementType}</td>
                          <td className="py-2 px-2 text-right font-mono">
                            {assessment.degree.toFixed(1)}
                          </td>
                          <td className="py-2 px-2">
                            <TrendArrow
                              current={assessment.degree}
                              previous={previous?.degree}
                            />
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">
                            {new Date(assessment.assessedAt).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-2 text-muted-foreground truncate max-w-[200px]">
                            {assessment.notes}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="mmt" className="mt-4">
            {mmtQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">{t("loading")}</p>
            ) : mmtData.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("mmt.noData")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">{t("mmt.muscleGroup")}</th>
                      <th className="text-left py-2 px-2">{t("mmt.side")}</th>
                      <th className="text-right py-2 px-2">{t("mmt.grade")}</th>
                      <th className="text-left py-2 px-2">{t("history.trend")}</th>
                      <th className="text-left py-2 px-2">{t("history.date")}</th>
                      <th className="text-left py-2 px-2">{t("mmt.notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mmtData.map((assessment, index) => {
                      const previous = mmtData.find(
                        (a, i) =>
                          i > index &&
                          a.muscleGroup === assessment.muscleGroup &&
                          a.side === assessment.side
                      );
                      return (
                        <tr key={assessment.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-2">{assessment.muscleGroup}</td>
                          <td className="py-2 px-2 capitalize">{assessment.side}</td>
                          <td className="py-2 px-2 text-right font-mono">
                            {assessment.grade % 1 === 0
                              ? assessment.grade.toFixed(0)
                              : assessment.grade.toFixed(1)}
                            <span className="text-muted-foreground">/5</span>
                          </td>
                          <td className="py-2 px-2">
                            <TrendArrow
                              current={assessment.grade}
                              previous={previous?.grade}
                            />
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">
                            {new Date(assessment.assessedAt).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-2 text-muted-foreground truncate max-w-[200px]">
                            {assessment.notes}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
