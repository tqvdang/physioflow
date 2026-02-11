"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useTemplates,
  type AssessmentTemplate,
  type TemplateCategory,
} from "@/hooks/use-assessment-templates";

interface TemplateSelectorProps {
  onSelect: (template: AssessmentTemplate) => void;
  locale?: string;
}

const CATEGORIES: { value: TemplateCategory | "all"; labelKey: string }[] = [
  { value: "all", labelKey: "all" },
  { value: "musculoskeletal", labelKey: "musculoskeletal" },
  { value: "neurological", labelKey: "neurological" },
  { value: "pediatric", labelKey: "pediatric" },
];

export function TemplateSelector({ onSelect, locale = "en" }: TemplateSelectorProps) {
  const t = useTranslations("assessmentTemplates");
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | "all">("all");

  const category = categoryFilter === "all" ? undefined : categoryFilter;
  const { data: templates, isLoading } = useTemplates(category);

  const isVi = locale === "vi";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("selectTemplate")}</h3>
        <Select
          value={categoryFilter}
          onValueChange={(val) => setCategoryFilter(val as TemplateCategory | "all")}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("filterByCategory")} />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {t(`categories.${cat.labelKey}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          {t("loading")}
        </div>
      )}

      {!isLoading && templates && templates.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t("noTemplates")}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((template) => (
          <Card
            key={template.id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => onSelect(template)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">
                  {isVi ? template.nameVi : template.name}
                </CardTitle>
                <Badge variant="secondary" className="ml-2 shrink-0">
                  {t(`categories.${template.category}`)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {isVi ? template.descriptionVi : template.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {template.itemCount} {t("items")}
                </span>
                <Button variant="outline" size="sm">
                  {t("useTemplate")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
