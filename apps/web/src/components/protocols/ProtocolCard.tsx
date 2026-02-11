"use client";

/**
 * Protocol card component for displaying a protocol template summary
 */

import { useLocale, useTranslations } from "next-intl";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ClinicalProtocol } from "@/types/protocol";
import { PROTOCOL_CATEGORY_INFO } from "@/types/protocol";
import {
  Calendar,
  Clock,
  Target,
  Dumbbell,
  ArrowRight,
} from "lucide-react";

interface ProtocolCardProps {
  protocol: ClinicalProtocol;
  onAssign?: (protocolId: string) => void;
  onViewDetails?: (protocolId: string) => void;
  showAssignButton?: boolean;
  className?: string;
}

export function ProtocolCard({
  protocol,
  onAssign,
  onViewDetails,
  showAssignButton = true,
  className,
}: ProtocolCardProps) {
  const t = useTranslations("protocols");
  const locale = useLocale();

  const displayName =
    locale === "vi" && protocol.protocolNameVi
      ? protocol.protocolNameVi
      : protocol.protocolName;
  const displayDescription =
    locale === "vi" && protocol.descriptionVi
      ? protocol.descriptionVi
      : protocol.description;
  const altName =
    locale === "vi" ? protocol.protocolName : protocol.protocolNameVi;

  const categoryInfo = PROTOCOL_CATEGORY_INFO[protocol.category] ?? {
    label: protocol.category,
    labelVi: protocol.category,
    color: "bg-gray-100 text-gray-800",
  };

  const categoryLabel =
    locale === "vi" ? categoryInfo.labelVi : categoryInfo.label;

  const shortTermGoals = protocol.goals.filter((g) => g.type === "short_term");
  const longTermGoals = protocol.goals.filter((g) => g.type === "long_term");

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CardTitle className="text-lg leading-tight cursor-default">
                    {displayName}
                  </CardTitle>
                </TooltipTrigger>
                {altName && altName !== displayName && (
                  <TooltipContent>
                    <p>{altName}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
          <Badge variant="secondary" className={categoryInfo.color}>
            {categoryLabel}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2 mt-1">
          {displayDescription}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Schedule info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>
              {protocol.durationWeeks} {t("weeks")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              {protocol.frequencyPerWeek}x/{t("week")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-4 w-4 shrink-0" />
            <span>
              {shortTermGoals.length + longTermGoals.length} {t("goals")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Dumbbell className="h-4 w-4 shrink-0" />
            <span>
              {protocol.exercises.length} {t("exercises")}
            </span>
          </div>
        </div>

        {/* Body regions tags */}
        {protocol.bodyRegions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {protocol.bodyRegions.map((region) => (
              <Badge key={region} variant="outline" className="text-xs">
                {region.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        {onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails(protocol.id)}
          >
            {t("viewDetails")}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        )}
        {showAssignButton && onAssign && (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onAssign(protocol.id)}
          >
            {t("assign")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
