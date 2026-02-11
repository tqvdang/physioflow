"use client";

/**
 * Standalone BHYT Card Validator Component
 * Validates card number format, prefix code, and optionally checks via API
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Search, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useInsuranceValidation,
  validateBhytCardLocal,
  type InsuranceValidationResult,
} from "@/hooks/use-insurance";

interface InsuranceValidatorProps {
  onValidResult?: (result: InsuranceValidationResult) => void;
}

export function InsuranceValidator({ onValidResult }: InsuranceValidatorProps) {
  const t = useTranslations("insurance");
  const [cardNumber, setCardNumber] = React.useState("");
  const [result, setResult] = React.useState<InsuranceValidationResult | null>(null);
  const validateMutation = useInsuranceValidation();

  const handleValidate = async () => {
    if (!cardNumber.trim()) return;

    const validationResult = await validateMutation.mutateAsync(cardNumber);
    setResult(validationResult);

    if (validationResult.valid && onValidResult) {
      onValidResult(validationResult);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleValidate();
    }
  };

  // Real-time local preview as user types
  const localPreview = React.useMemo(() => {
    if (cardNumber.length < 2) return null;
    return validateBhytCardLocal(cardNumber);
  }, [cardNumber]);

  const getStatusIcon = () => {
    if (!result) return null;

    if (result.valid && !result.expired) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (result.expired) {
      return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    }
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const getStatusBadge = () => {
    if (!result) return null;

    if (result.valid && !result.expired) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          {t("validation.valid")}
        </Badge>
      );
    }
    if (result.expired) {
      return <Badge variant="secondary">{t("validation.expired")}</Badge>;
    }
    if (result.errorCode === "invalid_format") {
      return <Badge variant="destructive">{t("validation.invalidFormat")}</Badge>;
    }
    if (result.errorCode === "invalid_prefix") {
      return <Badge variant="destructive">{t("validation.invalidPrefix")}</Badge>;
    }
    return <Badge variant="destructive">{t("validation.invalid")}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          {t("validation.title")}
        </CardTitle>
        <CardDescription>{t("validation.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input + Validate Button */}
        <div className="flex gap-2">
          <Input
            value={cardNumber}
            onChange={(e) => {
              setCardNumber(e.target.value.toUpperCase());
              setResult(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="DN4012345678901"
            className="font-mono flex-1"
            maxLength={15}
          />
          <Button
            onClick={handleValidate}
            disabled={!cardNumber.trim() || validateMutation.isPending}
          >
            {validateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("validation.validate")
            )}
          </Button>
        </div>

        {/* Real-time prefix preview while typing */}
        {localPreview && !result && cardNumber.length >= 2 && (
          <div className="text-sm text-muted-foreground">
            {localPreview.prefixLabel ? (
              <span>
                {t("validation.prefixDetected")}: {localPreview.prefixLabel} (
                {localPreview.defaultCoverage}%)
              </span>
            ) : (
              <span className="text-amber-600">
                {t("validation.unknownPrefix")}: {cardNumber.substring(0, 2)}
              </span>
            )}
          </div>
        )}

        {/* Validation Result */}
        {result && (
          <div className="rounded-lg border p-4 space-y-3">
            {/* Status Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="font-medium">
                  {result.valid && !result.expired
                    ? t("validation.valid")
                    : result.expired
                    ? t("validation.expired")
                    : t("validation.invalid")}
                </span>
              </div>
              {getStatusBadge()}
            </div>

            {/* Details */}
            {result.valid && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">
                    {t("card.number")}:
                  </span>
                  <p className="font-mono font-medium">{result.cardNumber}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("card.prefix")}:
                  </span>
                  <p className="font-medium">{result.prefixLabel}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("card.coverage")}:
                  </span>
                  <p className="font-medium">{result.defaultCoverage}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("card.copay")}:
                  </span>
                  <p className="font-medium">{100 - result.defaultCoverage}%</p>
                </div>
              </div>
            )}

            {/* Error message */}
            {result.message && (
              <p className="text-sm text-muted-foreground">{result.message}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
